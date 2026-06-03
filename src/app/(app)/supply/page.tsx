import { db } from "@/db/client";
import { skus, competitorSkus } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeatmapTabs } from "@/components/heatmap-tabs";
import { RestockTable } from "@/components/restock-table";
import { getCategoryBandMatrix, getGapSpus } from "@/lib/supply";
import { generateRestock, llmMode } from "@/lib/llm";

const fmt = (n: number) => new Intl.NumberFormat("zh-CN").format(n);

export default async function SupplyPage() {
  // 矩阵
  const [self, songshu, kuaisong] = await Promise.all([
    getCategoryBandMatrix("self"),
    getCategoryBandMatrix("songshu"),
    getCategoryBandMatrix("kuaisong"),
  ]);

  // 概览
  const [mySkuCount, songshuCount, kuaisongCount] = await Promise.all([
    db.select({ c: sql<number>`count(*)`.as("c") }).from(skus).where(eq(skus.source, "self")),
    db.select({ c: sql<number>`count(*)`.as("c") }).from(competitorSkus).where(eq(competitorSkus.competitorId, "CMP-songshu")),
    db.select({ c: sql<number>`count(*)`.as("c") }).from(competitorSkus).where(eq(competitorSkus.competitorId, "CMP-kuaisong")),
  ]);

  // 缺口 SPU + AI 补货建议
  const gaps = await getGapSpus();
  const suggestions = await generateRestock(gaps, 12);

  // 缺口品类 Top 排序
  const gapByCat = new Map<string, number>();
  for (const g of gaps) gapByCat.set(g.category, (gapByCat.get(g.category) || 0) + 1);
  const topGapCats = Array.from(gapByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const totalLift = suggestions.reduce((s, x) => s + x.expectedGmvLift, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">货盘对比 · AI 补货建议</h1>
          <p className="text-sm text-slate-500 mt-1">
            自家 vs 松鼠便利 / 快送熊 全量 SKU 价格带 × 品类对比 · AI 输出可执行补货决策清单
          </p>
        </div>
        <div className="text-xs text-slate-400">
          数据：脱敏示例 + 竞品 Apify 预跑（采集 2026-06-02）
        </div>
      </div>

      {/* 顶部概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">自家 SKU</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums">{fmt(mySkuCount[0]?.c || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">松鼠便利</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums text-orange-600">{fmt(songshuCount[0]?.c || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">快送熊</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums text-sky-600">{fmt(kuaisongCount[0]?.c || 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-700">AI 预估月 GMV 增量</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums text-emerald-700">¥{fmt(totalLift)}</div>
            <div className="text-[10px] text-emerald-600 mt-1">基于 Top {suggestions.length} 补货建议</div>
          </CardContent>
        </Card>
      </div>

      {/* 热力图 + Top 缺口品类侧栏 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">价格带 × 品类 缺口热力图</CardTitle>
            <CardDescription className="text-xs">
              单元格数值 = 竞品 SKU 数 - 自家 SKU 数（正数 = 缺口，颜色越深越急）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapTabs self={self} songshu={songshu} kuaisong={kuaisong} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">缺口品类 Top 8</CardTitle>
            <CardDescription className="text-xs">竞品有但自家缺失的 SPU 数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topGapCats.map(([cat, cnt]) => {
                const isCritical = cnt >= 5;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-14 text-sm">{cat}</div>
                    <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden relative">
                      <div
                        className={
                          "absolute inset-y-0 left-0 rounded transition-all " +
                          (isCritical ? "bg-rose-500" : "bg-amber-400")
                        }
                        style={{
                          width: `${Math.min(100, (cnt / Math.max(...topGapCats.map((c) => c[1]))) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm tabular-nums w-8 text-right">{cnt}</span>
                    {isCritical && <Badge variant="destructive" className="text-[10px]">急</Badge>}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t text-xs text-slate-500">
              全部缺口 SPU：<span className="font-medium text-slate-700">{gaps.length}</span> 个，已为你筛选 Top {suggestions.length} 进入下方建议表
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI 补货建议表 */}
      <RestockTable suggestions={suggestions} llmMode={llmMode} />
    </div>
  );
}
