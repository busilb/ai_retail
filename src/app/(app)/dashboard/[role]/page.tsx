import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_LABEL, ROLE_DESC, ROLES, type Role } from "@/lib/role";
import { getRecentDailyTotals, compareWeekOverWeek, getStoreList } from "@/lib/metrics";
import { generateBriefing, llmMode } from "@/lib/llm";
import { getGapSpus } from "@/lib/supply";
import { db } from "@/db/client";
import { skus } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { TrendChart } from "@/components/trend-chart";
import { AIBriefing } from "@/components/ai-briefing";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmt = (n: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(n);
const fmtMoney = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}万` : new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(n);

export default async function RoleDashboard({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!ROLES.includes(role as Role)) notFound();
  const session = await auth();
  const myRole = session?.user?.role;

  const rows = await getRecentDailyTotals(30);
  const cmp = compareWeekOverWeek(rows);
  const stores = await getStoreList();
  const isViewingOther = myRole && myRole !== role;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{ROLE_LABEL[role as Role]}视角看板</h1>
            {isViewingOther && (
              <Badge variant="outline" className="text-[10px]">越权预览</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{ROLE_DESC[role as Role]}</p>
        </div>
        <div className="text-xs text-slate-400">
          数据来源：示例脱敏数据 · {stores.length} 门店 · 近 30 天
        </div>
      </div>

      {/* KPI 卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="近 7 天 GMV"
          value={fmtMoney(cmp.cur.gmv)}
          unit="元"
          deltaPct={cmp.deltaPct.gmv}
          hint={`前 7 天 ${fmtMoney(cmp.prev.gmv)} 元`}
        />
        <KpiCard
          label="近 7 天订单"
          value={fmt(cmp.cur.orderCnt)}
          unit="单"
          deltaPct={cmp.deltaPct.orderCnt}
          hint={`前 7 天 ${fmt(cmp.prev.orderCnt)} 单`}
        />
        <KpiCard
          label="近 7 天访客"
          value={fmt(cmp.cur.uv)}
          unit="人"
          deltaPct={cmp.deltaPct.uv}
          hint={`前 7 天 ${fmt(cmp.prev.uv)} 人`}
        />
        <KpiCard
          label="客单价"
          value={cmp.cur.orderCnt ? (cmp.cur.gmv / cmp.cur.orderCnt).toFixed(1) : "—"}
          unit="元"
          hint="近 7 天聚合"
        />
      </div>

      {/* 角色定制内容 */}
      {role === "boss" && <BossSections rows={rows} cmp={cmp} />}
      {role === "director" && <DirectorSections rows={rows} cmp={cmp} />}
      {role === "manager" && <ManagerSections rows={rows} cmp={cmp} stores={stores} />}
      {role === "staff" && <StaffSections rows={rows} cmp={cmp} />}
    </div>
  );
}

// ============== BOSS：AI 摘要 + 趋势 + 待办 ==============
async function BossSections({
  rows,
  cmp,
}: {
  rows: Awaited<ReturnType<typeof getRecentDailyTotals>>;
  cmp: ReturnType<typeof compareWeekOverWeek>;
}) {
  // 取近 7 天 GMV 最大偏离的一天作为异常
  const last7 = rows.slice(-7);
  const ma = last7.reduce((s, r) => s + r.gmv, 0) / last7.length;
  const anomalyDay = last7.reduce((best, r) =>
    Math.abs(r.gmv - ma) > Math.abs(best.gmv - ma) ? r : best
  );
  const anomalyDev = ((anomalyDay.gmv - ma) / ma) * 100;

  // 缺口品类 Top
  const gaps = await getGapSpus();
  const catCount = new Map<string, number>();
  for (const g of gaps) catCount.set(g.category, (catCount.get(g.category) || 0) + 1);
  const topGapCat = Array.from(catCount.entries()).sort((a, b) => b[1] - a[1])[0];

  const briefing = await generateBriefing({
    curGmv: cmp.cur.gmv,
    prevGmv: cmp.prev.gmv,
    curOrders: cmp.cur.orderCnt,
    prevOrders: cmp.prev.orderCnt,
    curUv: cmp.cur.uv,
    prevUv: cmp.prev.uv,
    anomalies: [
      `${anomalyDay.date.slice(5)} 单日 GMV 偏离 7 日均值 ${anomalyDev > 0 ? "+" : ""}${anomalyDev.toFixed(0)}%`,
      "退款率维持在 2% 以下，履约时长稳态",
    ],
    competitorMovements: [
      `松鼠便利在「${topGapCat?.[0]}」品类有 ${topGapCat?.[1]} 个我方缺失 SPU`,
    ],
  });

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">近 30 天 GMV / 订单 / 访客 趋势</CardTitle>
          <CardDescription className="text-xs">绿点 = 高于 7 日均值 10% 以上 · 红点 = 低于</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">竞对动向（近 3 天）</CardTitle>
          <CardDescription className="text-xs">采集自松鼠 / 快送熊公开数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Badge variant="destructive" className="text-[10px] shrink-0 mt-0.5">缺口</Badge>
              <div>
                <div className="font-medium">松鼠便利 · {topGapCat?.[0]}</div>
                <div className="text-xs text-slate-600 mt-0.5">{topGapCat?.[1]} 个我方缺失 SPU，建议进入货盘页评估</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">调价</Badge>
              <div>
                <div className="font-medium">松鼠 · 饮料品类</div>
                <div className="text-xs text-slate-600 mt-0.5">8 个 SKU 集体降价 3-5%，主要在 5-10 元价格带</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">新品</Badge>
              <div>
                <div className="font-medium">快送熊 · 烘焙</div>
                <div className="text-xs text-slate-600 mt-0.5">新上 12 个 SKU，多集中在 10-20 元价格带</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">活动</Badge>
              <div>
                <div className="font-medium">美团神券节</div>
                <div className="text-xs text-slate-600 mt-0.5">两家竞对均已报名，建议本周内完成报名</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AIBriefing briefing={briefing} llmMode={llmMode} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">补货建议（汇总）</CardTitle>
          <CardDescription className="text-xs">Top 5 缺口品类</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from(catCount.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cat, cnt]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span>{cat}</span>
                  <Badge variant={cnt >= 5 ? "destructive" : "secondary"} className="tabular-nums">
                    {cnt} 缺
                  </Badge>
                </div>
              ))}
          </div>
          <a href="/supply" className="block mt-4 pt-3 border-t text-xs text-orange-600 hover:text-orange-700 hover:underline">
            进入货盘补货页 →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== DIRECTOR：品类 ROI + 趋势 ==============
async function DirectorSections({
  rows,
  cmp,
}: {
  rows: Awaited<ReturnType<typeof getRecentDailyTotals>>;
  cmp: ReturnType<typeof compareWeekOverWeek>;
}) {
  // 模拟品类 GMV / 毛利率（基于 SKU 数 + 类目权重）
  const catRows = await db
    .select({
      category: skus.category,
      skuCnt: sql<number>`count(*)`.as("sku_cnt"),
      avgPrice: sql<number>`avg(${skus.price})`.as("avg_price"),
      avgCost: sql<number>`avg(${skus.cost})`.as("avg_cost"),
    })
    .from(skus)
    .where(eq(skus.source, "self"))
    .groupBy(skus.category);

  const totalGmv7d = cmp.cur.gmv;
  const totalSkus = catRows.reduce((s, r) => s + r.skuCnt, 0);
  const categoryRoi = catRows
    .map((r) => {
      // 用 SKU 数 + 客单价模拟 GMV 占比
      const share = r.skuCnt / totalSkus;
      const catGmv = totalGmv7d * share * (0.7 + Math.random() * 0.6);
      const margin = (r.avgPrice - r.avgCost) / r.avgPrice;
      return { category: r.category, gmv: catGmv, margin, skuCnt: r.skuCnt, share };
    })
    .sort((a, b) => b.gmv - a.gmv);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">品类 ROI 排行（近 7 天）</CardTitle>
          <CardDescription className="text-xs">GMV 贡献 + 毛利率 + SKU 覆盖</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品类</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">占比</TableHead>
                <TableHead className="text-right">毛利率</TableHead>
                <TableHead className="text-right">SKU</TableHead>
                <TableHead className="text-right">健康度</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryRoi.map((r) => {
                const isHealthy = r.margin > 0.3 && r.share > 0.05;
                const isWarning = r.margin < 0.25;
                return (
                  <TableRow key={r.category}>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">¥{fmtMoney(r.gmv)}</TableCell>
                    <TableCell className="text-right text-xs text-slate-500 tabular-nums">{(r.share * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{(r.margin * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-sm text-slate-500 tabular-nums">{r.skuCnt}</TableCell>
                    <TableCell className="text-right">
                      {isWarning ? (
                        <Badge variant="destructive" className="text-[10px]">毛利偏低</Badge>
                      ) : isHealthy ? (
                        <Badge variant="default" className="text-[10px]">健康</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">中等</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">近 30 天 GMV 趋势</CardTitle>
          <CardDescription className="text-xs">全店合并</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

// ============== MANAGER：单店运营 ==============
function ManagerSections({
  rows,
  cmp,
  stores,
}: {
  rows: Awaited<ReturnType<typeof getRecentDailyTotals>>;
  cmp: ReturnType<typeof compareWeekOverWeek>;
  stores: Awaited<ReturnType<typeof getStoreList>>;
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{stores[0]?.name} · 近 30 天趋势</CardTitle>
              <CardDescription className="text-xs">商圈：{stores[0]?.bizCircle} · 单店切换待 Day 4 开放</CardDescription>
            </div>
            <Badge variant="outline">{stores[0]?.city}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart data={rows.map((r) => ({ ...r, gmv: r.gmv / stores.length, orderCnt: Math.floor(r.orderCnt / stores.length), uv: Math.floor(r.uv / stores.length) }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">本店 vs 商圈中位数</CardTitle>
          <CardDescription className="text-xs">近 7 天均值</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "日均 GMV", mine: cmp.cur.gmv / 7 / stores.length, median: cmp.cur.gmv / 7 / stores.length * 0.85, unit: "元", fmt: fmtMoney },
              { label: "日均订单", mine: cmp.cur.orderCnt / 7 / stores.length, median: cmp.cur.orderCnt / 7 / stores.length * 0.92, unit: "单", fmt },
              { label: "客单价", mine: cmp.cur.gmv / cmp.cur.orderCnt, median: (cmp.cur.gmv / cmp.cur.orderCnt) * 0.94, unit: "元", fmt: (n: number) => n.toFixed(1) },
              { label: "退款率", mine: 1.4, median: 2.1, unit: "%", fmt: (n: number) => n.toFixed(1), reverse: true },
            ].map((m) => {
              const diff = ((m.mine - m.median) / m.median) * 100;
              const better = m.reverse ? diff < 0 : diff > 0;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">{m.label}</span>
                    <span className={better ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium tabular-nums w-16">{m.fmt(m.mine)}{m.unit}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded relative overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
                      <div
                        className={"absolute inset-y-0 " + (better ? "bg-emerald-400" : "bg-rose-400")}
                        style={{
                          left: diff < 0 ? `${50 + diff / 2}%` : "50%",
                          width: `${Math.abs(diff) / 2}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 tabular-nums w-16 text-right">中位 {m.fmt(m.median)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== STAFF：今日待办 ==============
async function StaffSections({
  cmp,
}: {
  rows: Awaited<ReturnType<typeof getRecentDailyTotals>>;
  cmp: ReturnType<typeof compareWeekOverWeek>;
}) {
  const briefing = await generateBriefing({
    curGmv: cmp.cur.gmv,
    prevGmv: cmp.prev.gmv,
    curOrders: cmp.cur.orderCnt,
    prevOrders: cmp.prev.orderCnt,
    curUv: cmp.cur.uv,
    prevUv: cmp.prev.uv,
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <AIBriefing briefing={briefing} llmMode={llmMode} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日执行清单</CardTitle>
          <CardDescription className="text-xs">按场景分组</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <a href="/campaign" className="block p-3 rounded-lg border hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
              <div className="text-xs text-slate-500">活动报名</div>
              <div className="text-2xl font-semibold mt-1">5</div>
              <div className="text-[10px] text-slate-400 mt-1">待处理</div>
            </a>
            <a href="/supply" className="block p-3 rounded-lg border hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
              <div className="text-xs text-slate-500">补货建议</div>
              <div className="text-2xl font-semibold mt-1">12</div>
              <div className="text-[10px] text-slate-400 mt-1">待确认</div>
            </a>
            <a href="/pricing" className="block p-3 rounded-lg border hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
              <div className="text-xs text-slate-500">跟价报警</div>
              <div className="text-2xl font-semibold mt-1 text-rose-600">8</div>
              <div className="text-[10px] text-slate-400 mt-1">待跟进</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
