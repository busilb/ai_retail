import { db } from "@/db/client";
import { campaigns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles } from "lucide-react";
import { scoreCampaign, llmMode, type CampaignVerdict } from "@/lib/llm";
import { PushButton } from "@/components/push-button";

const PLATFORM_LABEL: Record<string, string> = { meituan: "美团", eleme: "饿了么", douyin: "抖音", jd: "京东到家" };
const PLATFORM_COLOR: Record<string, string> = {
  meituan: "bg-yellow-100 text-yellow-800 border-yellow-200",
  eleme: "bg-blue-100 text-blue-800 border-blue-200",
  douyin: "bg-slate-900 text-white",
  jd: "bg-rose-100 text-rose-800 border-rose-200",
};
const ACTION_STYLE: Record<CampaignVerdict["action"], { variant: "default" | "secondary" | "destructive"; emoji: string }> = {
  报名: { variant: "default", emoji: "✓" },
  缓报: { variant: "secondary", emoji: "⏸" },
  不报: { variant: "destructive", emoji: "✕" },
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default async function CampaignPage() {
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.signupStart));

  const now = Date.now();
  const verdicts = await Promise.all(
    rows.map((r) =>
      scoreCampaign({
        id: r.id,
        platform: r.platform,
        type: r.type,
        name: r.name,
        discountType: r.discountType,
        discountValue: r.discountValue,
        budgetLimit: r.budgetLimit,
        daysToSignup: Math.max(0, Math.ceil((new Date(r.signupEnd).getTime() - now) / 86400000)),
      })
    )
  );
  const verdictMap = new Map(verdicts.map((v) => [v.id, v]));

  const recommendCount = verdicts.filter((v) => v.action === "报名").length;
  const holdCount = verdicts.filter((v) => v.action === "缓报").length;
  const skipCount = verdicts.filter((v) => v.action === "不报").length;
  const totalScore = verdicts.reduce((s, v) => s + v.score, 0);
  const avgScore = verdicts.length ? Math.round(totalScore / verdicts.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">多平台活动报名 · AI 决策助手</h1>
          <p className="text-sm text-slate-500 mt-1">
            聚合美团 / 饿了么 / 抖音 / 京东到家 · AI 自动打分推荐报/不报 · 一键推送清单到企微
          </p>
        </div>
        <PushButton count={recommendCount} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-700 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI 建议报名</div>
            <div className="text-2xl font-semibold mt-1 text-emerald-700 tabular-nums">{recommendCount}</div>
            <div className="text-[10px] text-emerald-600 mt-1">含 {verdicts.filter(v => v.action === "报名" && v.score >= 85).length} 个高优先</div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">缓报 / 观察</div><div className="text-2xl font-semibold mt-1 text-amber-600 tabular-nums">{holdCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">不建议参加</div><div className="text-2xl font-semibold mt-1 text-slate-400 tabular-nums">{skipCount}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">平均 AI 分</div><div className="text-2xl font-semibold mt-1 tabular-nums">{avgScore}</div><div className="text-[10px] text-slate-400 mt-1">满分 100</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            活动列表
            <Badge variant="outline" className="text-[10px]">{llmMode === "real" ? "Claude 实时打分" : "规则引擎"}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Hover AI 建议徽章查看完整理由；点击行进入活动详情（Day 3 开放）
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>平台</TableHead>
                <TableHead>活动</TableHead>
                <TableHead>报名截止</TableHead>
                <TableHead>力度</TableHead>
                <TableHead>AI 评分</TableHead>
                <TableHead className="text-right">AI 建议</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const v = verdictMap.get(r.id);
                const style = v ? ACTION_STYLE[v.action] : null;
                const daysLeft = Math.max(0, Math.ceil((new Date(r.signupEnd).getTime() - now) / 86400000));
                return (
                  <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell>
                      <span className={"inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border " + (PLATFORM_COLOR[r.platform] || "")}>
                        {PLATFORM_LABEL[r.platform] || r.platform}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.type} · {r.discountType} {r.discountValue}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{fmtDate(r.signupEnd)}</div>
                      <div className={"text-[10px] " + (daysLeft <= 2 ? "text-rose-600 font-medium" : "text-slate-400")}>
                        {daysLeft === 0 ? "今日截止" : `剩 ${daysLeft} 天`}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {r.discountType} {r.discountValue}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={
                              v && v.score >= 75
                                ? "bg-emerald-500 h-full"
                                : v && v.score >= 55
                                ? "bg-amber-400 h-full"
                                : "bg-slate-400 h-full"
                            }
                            style={{ width: `${v?.score || 0}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums w-8">{v?.score}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {v && style && (
                        <Badge
                          variant={style.variant}
                          className="text-[10px] cursor-help"
                          title={v.reason}
                        >
                          {style.emoji} {v.action}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI 理由展开（每行展示理由） */}
      <Card className="bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            AI 决策理由（完整版）
          </CardTitle>
          <CardDescription className="text-xs">每条活动的判断依据 · 用于跟你团队对齐</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {rows.slice(0, 6).map((r) => {
              const v = verdictMap.get(r.id);
              const style = v ? ACTION_STYLE[v.action] : null;
              return (
                <div key={r.id} className="flex items-start gap-3 text-sm">
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
    </div>
  );
}
