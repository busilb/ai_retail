"use client";

import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import {
  LineChart,
  BarChart,
  HeatmapChart,
  RadarChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useRef } from "react";

echarts.use([
  LineChart,
  BarChart,
  HeatmapChart,
  RadarChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  RadarComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export const CHART_PALETTE = [
  "#f97316", // orange-500 (品牌主色)
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#a855f7", // purple-500
  "#f43f5e", // rose-500
  "#eab308", // yellow-500
  "#06b6d4", // cyan-500
  "#8b5cf6", // violet-500
];

export const BASE_TEXT_STYLE = {
  fontFamily:
    'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  color: "#475569",
};

export function Chart({
  option,
  height = 280,
  onEvents,
  className,
  notMerge,
}: {
  option: EChartsOption;
  height?: number | string;
  onEvents?: Record<string, (params: unknown) => void>;
  className?: string;
  notMerge?: boolean;
}) {
  const ref = useRef<ReactECharts>(null);
  return (
    <ReactECharts
      ref={ref}
      echarts={echarts}
      option={{
        color: CHART_PALETTE,
        textStyle: BASE_TEXT_STYLE,
        ...option,
      }}
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
      notMerge={notMerge}
      onEvents={onEvents as Record<string, (param: object) => void> | undefined}
      className={className}
    />
  );
}
