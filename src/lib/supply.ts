import { db } from "@/db/client";
import { skus, competitorSkus } from "@/db/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import type { GapSpu } from "./llm";

export const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "0-5", min: 0, max: 5 },
  { label: "5-10", min: 5, max: 10 },
  { label: "10-20", min: 10, max: 20 },
  { label: "20-50", min: 20, max: 50 },
  { label: "50-100", min: 50, max: 100 },
  { label: "100+", min: 100, max: 1e9 },
];

export function bandOf(price: number): string {
  for (const b of PRICE_BANDS) if (price >= b.min && price < b.max) return b.label;
  return "100+";
}

/** 返回 { category, band, count } 三元组矩阵（自家 / 单个竞品） */
export async function getCategoryBandMatrix(source: "self" | "songshu" | "kuaisong") {
  if (source === "self") {
    const rows = await db.select().from(skus).where(eq(skus.source, "self"));
    return aggregate(rows.map((r) => ({ category: r.category, price: r.price })));
  }
  const competitorId = source === "songshu" ? "CMP-songshu" : "CMP-kuaisong";
  const rows = await db
    .select()
    .from(competitorSkus)
    .where(eq(competitorSkus.competitorId, competitorId));
  return aggregate(rows.map((r) => ({ category: r.category, price: r.price })));
}

function aggregate(rows: { category: string; price: number }[]) {
  const map = new Map<string, Map<string, number>>();
  const cats = new Set<string>();
  for (const r of rows) {
    const b = bandOf(r.price);
    cats.add(r.category);
    if (!map.has(r.category)) map.set(r.category, new Map());
    const m = map.get(r.category)!;
    m.set(b, (m.get(b) || 0) + 1);
  }
  const result: { category: string; band: string; count: number }[] = [];
  for (const cat of cats) {
    for (const band of PRICE_BANDS) {
      result.push({ category: cat, band: band.label, count: map.get(cat)?.get(band.label) || 0 });
    }
  }
  return { rows: result, categories: Array.from(cats), bands: PRICE_BANDS.map((b) => b.label) };
}

/** 缺口 SPU：松鼠有但自家没有的 SPU，按品类聚合 */
export async function getGapSpus(): Promise<GapSpu[]> {
  const mySpuIds = await db.select({ spuId: skus.spuId }).from(skus).where(eq(skus.source, "self"));
  const mySet = new Set(mySpuIds.map((r) => r.spuId));

  const compRows = await db.select().from(competitorSkus);

  // 同一 SPU 在松鼠 + 快送熊都可能有，按 spuId 聚合，取最低价 + 最高月销
  const map = new Map<string, GapSpu>();
  for (const c of compRows) {
    if (!c.spuId || mySet.has(c.spuId)) continue;
    const existing = map.get(c.spuId);
    if (!existing) {
      map.set(c.spuId, {
        spuId: c.spuId,
        name: c.name,
        brand: c.brand || "",
        category: c.category,
        subcategory: c.subcategory || "",
        spec: c.spec || "",
        competitorPrice: c.price,
        competitorMonthlySales: c.monthlySales || 0,
        competitorName: c.competitorId === "CMP-songshu" ? "松鼠便利" : "快送熊",
      });
    } else {
      // 取最低价 + 最高月销
      if (c.price < existing.competitorPrice) existing.competitorPrice = c.price;
      if ((c.monthlySales || 0) > (existing.competitorMonthlySales || 0)) {
        existing.competitorMonthlySales = c.monthlySales || 0;
        existing.competitorName = c.competitorId === "CMP-songshu" ? "松鼠便利" : "快送熊";
      }
    }
  }
  return Array.from(map.values());
}

export async function getGapSpusInCell(category: string, band: string): Promise<GapSpu[]> {
  const all = await getGapSpus();
  return all.filter((s) => s.category === category && bandOf(s.competitorPrice) === band);
}
