import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  deltaPct,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  deltaPct?: number;
  hint?: string;
}) {
  const isUp = deltaPct !== undefined && deltaPct > 0.05;
  const isDown = deltaPct !== undefined && deltaPct < -0.05;
  const flat = deltaPct !== undefined && !isUp && !isDown;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 lg:p-5">
        <div className="text-xs text-slate-500 mb-1.5">{label}</div>
        <div className="flex items-baseline gap-1">
          <div className="text-2xl lg:text-3xl font-semibold tabular-nums">{value}</div>
          {unit && <div className="text-sm text-slate-500">{unit}</div>}
        </div>
        {deltaPct !== undefined && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              isUp && "text-emerald-600",
              isDown && "text-rose-600",
              flat && "text-slate-500"
            )}
          >
            {isUp && <ArrowUp className="h-3 w-3" />}
            {isDown && <ArrowDown className="h-3 w-3" />}
            {flat && <Minus className="h-3 w-3" />}
            <span>
              {deltaPct > 0 ? "+" : ""}
              {deltaPct.toFixed(1)}%
            </span>
            <span className="text-slate-400 ml-1">vs 上周同期</span>
          </div>
        )}
        {hint && <div className="mt-1 text-[10px] text-slate-400">{hint}</div>}
      </CardContent>
    </Card>
  );
}
