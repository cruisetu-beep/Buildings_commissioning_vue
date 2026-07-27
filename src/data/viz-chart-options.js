/* ═══════════════════════════════════════════════════════════════
   viz-chart-options.js · 按可视化类型生成 ECharts option
   ───────────────────────────────────────────────────────────────
   v4 方案:一类一个 builder,统一读 resultJSON.chart(数据自带语义,
   不再依赖外部 V1~V5 映射)。buildChartOption 按 visualType 分发。
   批次1:A 聚类 / B 回归 / D 分布;C(批次2)、E(批次3)随后补齐。
   ═══════════════════════════════════════════════════════════════ */
import { CHART_THEME } from "./viz-data.js";

const TOOLTIP = {
  backgroundColor: "rgba(15,29,61,0.92)",
  borderWidth: 0,
  textStyle: { color: "#fff", fontSize: 11 },
};

// 右上角文本注记(多行);cluster / distribution 复用
function annotationGraphic(lines, { right = 40, top = 45, color = "#0891b2" } = {}) {
  if (!lines || !lines.length) return [];
  return [{
    type: "text", right, top,
    style: {
      text: lines.join("\n"),
      fontSize: 12, fontWeight: 600, fill: color, lineHeight: 18,
      fontFamily: '"JetBrains Mono", monospace',
    },
  }];
}

/* ─── A 类 · K-means 散点(两簇着色 + 均值参考线) ─── */
export function buildClusterOption(c) {
  return {
    ...CHART_THEME,
    tooltip: {
      ...TOOLTIP, trigger: "item",
      formatter: (p) => `<b>${p.seriesName}</b><br/>温度: ${p.value[0]} ℃<br/>电耗: ${p.value[1]} kW`,
    },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, itemGap: 24, data: ["低工况簇", "高工况簇"] },
    grid: { top: 40, bottom: 55, left: 68, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis, type: "value",
      name: c.xName, nameLocation: "middle", nameGap: 30,
      min: c.xMin, max: c.xMax, splitNumber: 6,
    },
    yAxis: {
      ...CHART_THEME.yAxis, type: "value",
      name: c.yName, nameLocation: "middle", nameGap: 45,
      min: c.yMin, max: c.yMax,
    },
    series: [
      {
        name: "低工况簇", type: "scatter", data: c.low, symbolSize: 9,
        itemStyle: { color: "#7a5cff", opacity: 0.72, borderColor: "#5b3fd6", borderWidth: 1 },
        markLine: {
          symbol: "none", silent: true,
          lineStyle: { color: "#7a5cff", type: "dashed", width: 1, opacity: 0.5 },
          label: { color: "#7a5cff", fontSize: 10, formatter: `低簇 ${c.lowMean} kW` },
          data: [{ yAxis: c.lowMean }],
        },
      },
      {
        name: "高工况簇", type: "scatter", data: c.high, symbolSize: 9,
        itemStyle: { color: "#2f7fff", opacity: 0.72, borderColor: "#1860d4", borderWidth: 1 },
        markLine: {
          symbol: "none", silent: true,
          lineStyle: { color: "#2f7fff", type: "dashed", width: 1, opacity: 0.5 },
          label: { color: "#2f7fff", fontSize: 10, formatter: `高簇 ${c.highMean} kW` },
          data: [{ yAxis: c.highMean }],
        },
      },
    ],
    graphic: annotationGraphic(c.annotation, { right: 45, top: 45, color: "#d97706" }),
  };
}

/* ─── B 类 · 线性回归散点 + 拟合线 + 指标高亮框 ─── */
export function buildRegressionOption(c) {
  const hl = c.highlight || {};
  const hlColor = hl.color === "ok" ? "#10b981" : "#e54e6e";
  const hlFill = hl.color === "ok" ? "rgba(16,185,129,0.10)" : "rgba(229,78,110,0.10)";
  const hlStroke = hl.color === "ok" ? "rgba(16,185,129,0.35)" : "rgba(229,78,110,0.35)";
  return {
    ...CHART_THEME,
    tooltip: {
      ...TOOLTIP, trigger: "item",
      formatter: (p) =>
        p.seriesName === c.lineName
          ? `<b>${c.lineName}</b><br/>${c.xName.split(" ")[0]}: ${p.value[0]}<br/>预测: ${Math.round(p.value[1])}`
          : `${p.value[0]}<br/>${Math.round(p.value[1])}`,
    },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, data: [c.pointName, c.lineName] },
    grid: { top: 40, bottom: 55, left: 72, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis, type: "value",
      name: c.xName, nameLocation: "middle", nameGap: 30,
      min: c.xMin, max: c.xMax, splitNumber: 6,
    },
    yAxis: {
      ...CHART_THEME.yAxis, type: "value",
      name: c.yName, nameLocation: "middle", nameGap: 52,
      min: c.yMin, max: c.yMax,
    },
    series: [
      {
        name: c.pointName, type: "scatter", data: c.points, symbolSize: 7,
        itemStyle: { color: "#1f6feb", opacity: 0.5, borderColor: "#1860d4", borderWidth: 0.5 },
      },
      {
        name: c.lineName, type: "line", data: c.fitLine, showSymbol: false, smooth: false,
        lineStyle: { color: "#e54e6e", width: 2.5, type: "solid" }, z: 3,
      },
    ],
    graphic: hl.value ? [{
      type: "group", right: 60, top: 45,
      children: [
        { type: "rect", shape: { width: 140, height: 52, r: 6 }, style: { fill: hlFill, stroke: hlStroke, lineWidth: 1 } },
        { type: "text", left: 12, top: 8, style: { text: hl.value, fontSize: 18, fontWeight: 700, fill: hlColor, fontFamily: '"JetBrains Mono", monospace' } },
        { type: "text", left: 12, top: 34, style: { text: hl.sub || "", fontSize: 10, fill: hlColor, fontFamily: '"Noto Sans SC", sans-serif' } },
      ],
    }] : [],
  };
}

/* ─── D 类 · 分布直方图(强调峰值区 + 指标注记) ─── */
export function buildDistributionOption(c) {
  return {
    ...CHART_THEME,
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, data: [c.yName] },
    grid: { top: 40, bottom: 60, left: 60, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis, type: "category",
      data: c.buckets.map((x) => x.range),
      name: c.xName, nameLocation: "middle", nameGap: 32,
      axisLabel: { ...CHART_THEME.xAxis.axisLabel, interval: 0 },
    },
    yAxis: { ...CHART_THEME.yAxis, type: "value", name: c.yName, nameLocation: "middle", nameGap: 42 },
    series: [
      {
        name: c.yName, type: "bar", barWidth: "72%",
        data: c.buckets.map((x, i) => ({
          value: x.count,
          itemStyle: {
            color:
              i === c.zeroIdx
                ? "#94a3b8"
                : (c.emphasisIdx || []).includes(i)
                ? { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#06b6d4" }, { offset: 1, color: "#0891b2" }] }
                : "rgba(6,182,212,0.42)",
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: { show: true, position: "top", color: "#38496b", fontSize: 10, formatter: (p) => (p.value > 5 ? p.value : "") },
      },
    ],
    graphic: annotationGraphic(c.annotation, { right: 40, top: 45, color: "#0891b2" }),
  };
}

/* ─── 分发入口:按 visualType 选 builder ─── */
export function buildChartOption(visualType, chart) {
  switch (visualType) {
    case "A": return buildClusterOption(chart);
    case "B": return buildRegressionOption(chart);
    case "D": return buildDistributionOption(chart);
    // C(批次2)、E(批次3)待补
    default: return {};
  }
}
