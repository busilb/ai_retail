"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RestockSuggestion } from "@/lib/llm";

const fmt = (n: number) => new Intl.NumberFormat("zh-CN").format(n);
const CONFIDENCE_VARIANT: Record<RestockSuggestion["confidence"], "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};
const CONFIDENCE_LABEL: Record<RestockSuggestion["confidence"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function RestockTable({
  suggestions,
  llmMode,
}: {
  suggestions: RestockSuggestion[];
  llmMode: "real" | "mock";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.map((s) => s.spuId)));
  const totalLift = suggestions
    .filter((s) => selected.has(s.spuId))
    .reduce((sum, s) => sum + s.expectedGmvLift, 0);

  const toggle = (spuId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(spuId)) next.delete(spuId);
      else next.add(spuId);
      return next;
    });
  };

  const copyToClipboard = () => {
    const picked = suggestions.filter((s) => selected.has(s.spuId));
    const md = [
      "# 补货采购清单",
      `生成时间：${new Date().toLocaleString("zh-CN")}`,
      `预估月度 GMV 增量：¥${fmt(totalLift)}`,
      "",
      "| 商品 | 品牌 | 规格 | 建议进货价 | 建议售价 | 预估月销 | 预估月 GMV | 置信度 | 理由 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      ...picked.map(
        (s) =>
          `| ${s.suggestedName} | ${s.suggestedBrand} | ${s.suggestedSpec} | ¥${s.suggestedCostMin}-${s.suggestedCostMax} | ¥${s.suggestedPrice} | ${fmt(s.expectedMonthlySales)} | ¥${fmt(s.expectedGmvLift)} | ${CONFIDENCE_LABEL[s.confidence]} | ${s.reasons[0]} |`
      ),
    ].join("\n");
    navigator.clipboard.writeText(md);
    toast.success(`已复制 ${picked.length} 条采购清单到剪贴板`, {
      description: `预估月度 GMV 增量 ¥${fmt(totalLift)}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              AI 补货建议
              <Badge variant="outline" className="text-[10px] ml-2">
                {llmMode === "real" ? "Claude 实时生成" : "本地规则引擎（演示）"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              基于缺口 SPU + 竞对月销 + 价格带分析 · 已选 {selected.size}/{suggestions.length} 项 · 预估月度 GMV 增量
              <span className="font-medium text-emerald-700 ml-1">¥{fmt(totalLift)}</span>
            </CardDescription>
          </div>
          <Button size="sm" variant="default" onClick={copyToClipboard} disabled={selected.size === 0}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> 复制采购单
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4"></TableHead>
              <TableHead>商品</TableHead>
              <TableHead className="text-right">进货价</TableHead>
              <TableHead className="text-right">建议售价</TableHead>
              <TableHead className="text-right">预估月销</TableHead>
              <TableHead className="text-right">月 GMV 增量</TableHead>
              <TableHead className="w-16">置信</TableHead>
              <TableHead className="hidden lg:table-cell">理由</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.map((s) => (
              <TableRow key={s.spuId} className={selected.has(s.spuId) ? "" : "opacity-50"}>
                <TableCell className="pl-4">
                  <input
                    type="checkbox"
                    checked={selected.has(s.spuId)}
                    onChange={() => toggle(s.spuId)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{s.suggestedName}</div>
                  <div className="text-xs text-slate-500">
                    {s.suggestedBrand} · {s.suggestedSpec} · <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  ¥{s.suggestedCostMin}-{s.suggestedCostMax}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums font-medium">¥{s.suggestedPrice}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{fmt(s.expectedMonthlySales)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums font-medium text-emerald-700">
                  ¥{fmt(s.expectedGmvLift)}
                </TableCell>
                <TableCell>
                  <Badge variant={CONFIDENCE_VARIANT[s.confidence]} className="text-[10px]">
                    {CONFIDENCE_LABEL[s.confidence]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <ul className="text-xs text-slate-600 space-y-0.5 list-disc pl-4">
                    {s.reasons.slice(0, 2).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
