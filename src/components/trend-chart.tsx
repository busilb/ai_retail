"use client";

import { Chart } from "./chart";

export type TrendPoint = { date: string; gmv: number; orderCnt: number; uv: number };

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const dates = data.map((d) => d.date.slice(5)); // MM-DD
  const gmv = data.map((d) => Number((d.gmv / 10000).toFixed(2))); // 万元
  const orders = data.map((d) => d.orderCnt);
  const uv = data.map((d) => d.uv);

  // 计算 GMV 异常点（偏离 7 日均值 ±10%）
  const ma7 = gmv.map((_, i) => {
    const win = gmv.slice(Math.max(0, i - 6), i + 1);
    return win.reduce((s, v) => s + v, 0) / win.length;
  });
  const anomalies = gmv
    .map((v, i) => ({ value: v, idx: i, dev: (v - ma7[i]) / ma7[i] }))
    .filter((x) => Math.abs(x.dev) > 0.1)
    .map((x) => ({
      name: `${dates[x.idx]} (${x.dev > 0 ? "+" : ""}${(x.dev * 100).toFixed(0)}%)`,
      xAxis: x.idx,
      yAxis: x.value,
      itemStyle: { color: x.dev > 0 ? "#10b981" : "#ef4444" },
    }));

  return (
    <Chart
      height={300}
      option={{
        legend: { right: 10, top: 0, textStyle: { fontSize: 11 } },
        grid: { left: 50, right: 50, top: 30, bottom: 30 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
        },
        xAxis: {
          type: "category",
          data: dates,
          boundaryGap: false,
          axisLabel: { fontSize: 10 },
        },
        yAxis: [
          {
            type: "value",
            name: "GMV (万)",
            position: "left",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { fontSize: 10 },
          },
          {
            type: "value",
            name: "订单 / 访客",
            position: "right",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { fontSize: 10 },
          },
        ],
        series: [
          {
            name: "GMV (万)",
            type: "line",
            smooth: true,
            data: gmv,
            symbol: "none",
            lineStyle: { width: 2.5 },
            areaStyle: { opacity: 0.15 },
            markPoint: {
              symbolSize: 38,
              label: { fontSize: 9, color: "#fff" },
              data: anomalies,
            },
          },
          {
            name: "订单",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            data: orders,
            symbol: "none",
            lineStyle: { width: 1.5, type: "dashed" },
          },
          {
            name: "访客 UV",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            data: uv,
            symbol: "none",
            lineStyle: { width: 1.5, type: "dashed" },
          },
        ],
      }}
    />
  );
}
