import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import type { Briefing } from "@/lib/llm";

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};
const PRIORITY_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

export function AIBriefing({ briefing, llmMode }: { briefing: Briefing; llmMode: "real" | "mock" }) {
  return (
    <Card className="lg:col-span-2 bg-gradient-to-br from-orange-50/60 to-pink-50/30 border-orange-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              AI 经营摘要
              <Badge variant="outline" className="text-[10px] ml-1">
                {llmMode === "real" ? "Claude 实时" : "规则引擎"}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm text-slate-700 leading-relaxed">
              {briefing.headline}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2.5 text-sm text-slate-700 leading-relaxed">
          {briefing.paragraphs.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }} />
          ))}
        </div>

        <div className="pt-3 border-t border-orange-200/60">
          <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            今日待办（{briefing.todos.length} 项）
          </div>
          <div className="space-y-1.5">
            {briefing.todos.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-md bg-white/70 border border-orange-100 hover:bg-white transition-colors group cursor-pointer"
              >
                <Badge variant={PRIORITY_VARIANT[t.priority]} className="text-[10px] mt-0.5 shrink-0">
                  {PRIORITY_LABEL[t.priority]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{t.reason}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600 shrink-0 mt-1 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
