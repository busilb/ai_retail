import { db } from "@/db/client";
import { skus, competitorSkus } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles } from "lucide-react";
import { recommendPricing, llmMode, type PricingVerdict } from "@/lib/llm";

const COMPETITOR_NAME: Record<string, string> = {
  "CMP-songshu": "松鼠便利",
  "CMP-kuaisong": "快送熊",
};

const ACTION_STYLE: Record<PricingVerdict["action"], { variant: "default" | "secondary" | "destructive"; emoji: string }> = {
  跟价: { variant: "destructive", emoji: "⬇" },
  守住: { variant: "default", emoji: "✓" },
  差异化: { variant: "secondary", emoji: "🎁" },
};

export default async function PricingPage() {
  const mySkus = await db.select().from(skus).where(eq(skus.source, "self"));
  const mySpuIds = mySkus.map((s) => s.spuId);

  const compRows = mySpuIds.length
    ? await db.select().from(competitorSkus).where(inArray(competitorSkus.spuId, mySpuIds))
    : [];

  const compMap = new Map<string, typeof compRows>();
  for (const c of compRows) {
    if (!c.spuId) continue;
    if (!compMap.has(c.spuId)) compMap.set(c.spuId, []);
    compMap.get(c.spuId)!.push(c);
  }

  type Row = {
    spuId: string;
    name: string;
    category: string;
    myPrice: number;
    competitors: { name: string; price: number; diffPct: number }[];
    maxDiffPct: number;
    minRivalPrice: number;
    avgRivalPrice: number;
  };
  const rows: Row[] = [];
  for (const s of mySkus) {
    const comps = compMap.get(s.spuId) || [];
    if (comps.length === 0) continue;
    const detailed = comps.map((c) => ({
      name: COMPETITOR_NAME[c.competitorId] || c.competitorId,
      price: c.price,
      diffPct: ((s.price - c.price) / c.price) * 100,
    }));
    const minRivalPrice = Math.min(...comps.map((c) => c.price));
    const avgRivalPrice = comps.reduce((sum, c) => sum + c.price, 0) / comps.length;
    const maxDiffPct = Math.max(...detailed.map((d) => Math.abs(d.diffPct)));
    rows.push({
      spuId: s.spuId,
      name: s.name,
      category: s.category,
      myPrice: s.price,
      competitors: detailed,
      maxDiffPct,
      minRivalPrice,
      avgRivalPrice,
    });
  }

  rows.sort((a, b) => b.maxDiffPct - a.maxDiffPct);
  const alerts = rows.filter((r) => r.maxDiffPct >= 5).slice(0, 30);

  // AI 跟价建议
  const verdicts = await Promise.all(
    alerts.map((r) =>
      recommendPricing({
        spuId: r.spuId,
        name: r.name,
        myPrice: r.myPrice,
        competitorMinPrice: r.minRivalPrice,
        competitorAvgPrice: r.avgRivalPrice,
      })
    )
  );
  const verdictMap = new Map(verdicts.map((v) => [v.spuId, v]));

  const followCount = verdicts.filter((v) => v.action === "跟价").length;
  const holdCount = verdicts.filter((v) => v.action === "守住").length;
  const diffCount = verdicts.filter((v) => v.action === "差异化").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">竞对跟价 · AI 价盘助手</h1>
        <p className="text-sm text-slate-500 mt-1">
          自家 SKU 与松鼠便利 / 快送熊同 SPU 价格对比 · 偏离 ≥5% 自动报警 · AI 给跟/不跟决策
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">监控 SKU</div><div className="text-2xl font-semibold mt-1 tabular-nums">{rows.length}</div></CardContent></Card>
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
          <CardContent className="p-4">
            <div className="text-xs text-rose-700 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI 建议跟价</div>
            <div className="text-2xl font-semibold mt-1 text-rose-700 tabular-nums">{followCount}</div>
            <div className="text-[10px] text-rose-600 mt-1">价差过大、影响转化</div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">建议守住</div><div className="text-2xl font-semibold mt-1 text-emerald-600 tabular-nums">{holdCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">建议差异化</div><div className="text-2xl font-semibold mt-1 text-amber-600 tabular-nums">{diffCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            跟价报警 · Top {alerts.length}
            <Badge variant="outline" className="text-[10px]">{llmMode === "real" ? "Claude 实时分析" : "规则引擎"}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            按价差绝对值倒序 · AI 建议徽章可 hover 查看理由
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead className="text-right">我方</TableHead>
                <TableHead className="text-right">松鼠</TableHead>
                <TableHead className="text-right">快送熊</TableHead>
                <TableHead className="text-right">价差</TableHead>
                <TableHead className="text-right">AI 建议</TableHead>
                <TableHead className="text-right">建议价</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((r) => {
                const songshu = r.competitors.find((c) => c.name === "松鼠便利");
                const kuai = r.competitors.find((c) => c.name === "快送熊");
                const sign = r.myPrice > r.minRivalPrice ? "+" : "";
                const diff = ((r.myPrice - r.minRivalPrice) / r.minRivalPrice) * 100;
                const v = verdictMap.get(r.spuId);
                const style = v ? ACTION_STYLE[v.action] : null;
                return (
                  <TableRow key={r.spuId}>
                    <TableCell>
                      <div className="text-sm">{r.name}</div>
                      <div className="text-xs text-slate-500"><Badge variant="outline" className="text-[10px]">{r.category}</Badge></div>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums font-medium">¥{r.myPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      ¥{songshu?.price.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      ¥{kuai?.price.toFixed(2) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={diff > 5 ? "destructive" : diff < -5 ? "default" : "secondary"} className="tabular-nums">
                        {sign}{diff.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {v && style && (
                        <Badge variant={style.variant} className="text-[10px] cursor-help" title={v.reason}>
                          {style.emoji} {v.action}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-emerald-700 font-medium">
                      {v?.suggestedPrice ? `¥${v.suggestedPrice}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {alerts.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-500">暂无偏离超过 5% 的 SKU</div>
          )}
        </CardContent>
      </Card>

      {/* AI 理由展开 */}
      {alerts.length > 0 && (
        <Card className="bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              AI 跟价理由（Top 8）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {alerts.slice(0, 8).map((r) => {
                const v = verdictMap.get(r.spuId);
                const style = v ? ACTION_STYLE[v.action] : null;
                return (
                  <div key={r.spuId} className="flex items-start gap-3 text-sm">
                    {v && style && (
                      <Badge variant={style.variant} className="text-[10px] shrink-0 mt-0.5 w-14 justify-center">
                        {v.action}
                      </Badge>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{v?.reason}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
