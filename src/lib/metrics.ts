import { db } from "@/db/client";
import { dailyMetrics, stores } from "@/db/schema";
import { desc, sql, eq, and, gte } from "drizzle-orm";

/** 拉过去 N 天所有门店聚合后的 daily totals */
export async function getRecentDailyTotals(days = 30) {
  const rows = await db
    .select({
      date: dailyMetrics.date,
      gmv: sql<number>`sum(${dailyMetrics.gmv})`.as("gmv"),
      orderCnt: sql<number>`sum(${dailyMetrics.orderCnt})`.as("order_cnt"),
      uv: sql<number>`sum(${dailyMetrics.uv})`.as("uv"),
      pv: sql<number>`sum(${dailyMetrics.pv})`.as("pv"),
      refundRate: sql<number>`avg(${dailyMetrics.refundRate})`.as("refund_rate"),
    })
    .from(dailyMetrics)
    .groupBy(dailyMetrics.date)
    .orderBy(desc(dailyMetrics.date))
    .limit(days);
  return rows.reverse();
}

export async function getStoreList() {
  return db.select().from(stores).orderBy(stores.id);
}

export async function getStoreDailyTotals(storeId: string, days = 30) {
  const rows = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.storeId, storeId))
    .orderBy(desc(dailyMetrics.date))
    .limit(days);
  return rows.reverse();
}

export type DailyTotal = Awaited<ReturnType<typeof getRecentDailyTotals>>[number];

/** 同期对比辅助：返回近 7 天 vs 前 7 天 */
export function compareWeekOverWeek(rows: DailyTotal[]) {
  const last7 = rows.slice(-7);
  const prev7 = rows.slice(-14, -7);
  const sumKey = (arr: DailyTotal[], k: keyof DailyTotal) =>
    arr.reduce((s, r) => s + Number(r[k] || 0), 0);
  const cur = {
    gmv: sumKey(last7, "gmv"),
    orderCnt: sumKey(last7, "orderCnt"),
    uv: sumKey(last7, "uv"),
  };
  const prev = {
    gmv: sumKey(prev7, "gmv"),
    orderCnt: sumKey(prev7, "orderCnt"),
    uv: sumKey(prev7, "uv"),
  };
  const pct = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);
  return {
    cur,
    prev,
    deltaPct: {
      gmv: pct(cur.gmv, prev.gmv),
      orderCnt: pct(cur.orderCnt, prev.orderCnt),
      uv: pct(cur.uv, prev.uv),
    },
  };
}
