"use client";

import { Chart } from "./chart";

export type MatrixData = {
  rows: { category: string; band: string; count: number }[];
  categories: string[];
  bands: string[];
};

export function PriceBandHeatmap({
  selfData,
  rivalData,
  rivalName,
}: {
  selfData: MatrixData;
  rivalData: MatrixData;
  rivalName: string;
}) {
  // 合并：横轴 = 价格带，纵轴 = 品类（取并集），值 = 自家数 - 竞品数（负数 = 缺口）
  const categories = Array.from(new Set([...selfData.categories, ...rivalData.categories]));
  const bands = selfData.bands;

  const selfMap = new Map<string, number>();
  for (const r of selfData.rows) selfMap.set(`${r.category}|${r.band}`, r.count);
  const rivalMap = new Map<string, number>();
  for (const r of rivalData.rows) rivalMap.set(`${r.category}|${r.band}`, r.count);

  // 三组数据：自家 / 竞品 / 缺口（rival - self）
  const dataDiff: [number, number, number, string, number, number][] = [];
  for (let ci = 0; ci < categories.length; ci++) {
    for (let bi = 0; bi < bands.length; bi++) {
      const cat = categories[ci];
      const band = bands[bi];
      const self = selfMap.get(`${cat}|${band}`) || 0;
      const rival = rivalMap.get(`${cat}|${band}`) || 0;
      const gap = rival - self;
      dataDiff.push([bi, ci, gap, cat, self, rival]);
    }
  }

  const maxGap = Math.max(...dataDiff.map((d) => d[2]));
  const minGap = Math.min(...dataDiff.map((d) => d[2]));

  return (
    <Chart
      height={Math.max(280, categories.length * 30 + 80)}
      option={{
        tooltip: {
          position: "top",
          formatter: (p: unknown) => {
            const d = (p as { data: [number, number, number, string, number, number] }).data;
            const band = bands[d[0]];
            const cat = d[3];
            const self = d[4];
            const rival = d[5];
            const gap = d[2];
            const verdict = gap > 5 ? "🔴 缺口大" : gap > 0 ? "🟡 覆盖不足" : gap === 0 ? "🟢 持平" : "🔵 我方更全";
            return `<div style="font-size:12px"><strong>${cat} · ¥${band}</strong><br/>
              自家：${self} 个 SKU<br/>
              ${rivalName}：${rival} 个 SKU<br/>
              缺口：${gap > 0 ? "+" : ""}${gap}（${verdict}）<br/>
              <span style="color:#94a3b8">点击查看缺口 SPU 详情</span>
            </div>`;
          },
        },
        grid: { left: 90, right: 24, top: 32, bottom: 50 },
        xAxis: {
          type: "category",
          data: bands.map((b) => `¥${b}`),
          splitArea: { show: true },
          axisLabel: { fontSize: 11 },
        },
        yAxis: {
          type: "category",
          data: categories,
          splitArea: { show: true },
          axisLabel: { fontSize: 11 },
        },
        visualMap: {
          min: Math.min(minGap, -1),
          max: Math.max(maxGap, 1),
          calculable: false,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          textStyle: { fontSize: 10 },
          inRange: {
            // 蓝(我方更全)→白(持平)→橙红(缺口)
            color: ["#0ea5e9", "#bae6fd", "#f5f5f5", "#fed7aa", "#f97316", "#dc2626"],
          },
          text: ["缺口大 →", "← 我方更全"],
        },
        series: [
          {
            name: "缺口",
            type: "heatmap",
            data: dataDiff.map((d) => [d[0], d[1], d[2]]),
            label: {
              show: true,
              fontSize: 10,
              formatter: (p: unknown) => {
                const v = (p as { data: [number, number, number] }).data[2];
                return v === 0 ? "" : String(v);
              },
            },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.4)" },
            },
          },
        ],
      }}
    />
  );
}
