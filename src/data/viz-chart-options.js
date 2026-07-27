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

// 右侧指标高亮框(大数值 + 副标题);B 回归 / C 日对 复用
function highlightGraphic(hl, { right = 60, top = 45 } = {}) {
  if (!hl || !hl.value) return [];
  const color = hl.color === "ok" ? "#10b981" : "#e54e6e";
  const fill = hl.color === "ok" ? "rgba(16,185,129,0.10)" : "rgba(229,78,110,0.10)";
  const stroke = hl.color === "ok" ? "rgba(16,185,129,0.35)" : "rgba(229,78,110,0.35)";
  return [{
    type: "group", right, top,
    children: [
      { type: "rect", shape: { width: 150, height: 52, r: 6 }, style: { fill, stroke, lineWidth: 1 } },
      { type: "text", left: 12, top: 8, style: { text: hl.value, fontSize: 18, fontWeight: 700, fill: color, fontFamily: '"JetBrains Mono", monospace' } },
      { type: "text", left: 12, top: 34, style: { text: hl.sub || "", fontSize: 10, fill: color, fontFamily: '"Noto Sans SC", sans-serif' } },
    ],
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
    graphic: highlightGraphic(c.highlight, { right: 60, top: 45 }),
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

/* ─── C 类 · 日对对比分组柱(Day A vs Day B 按设备分项) ─── */
export function buildDayPairOption(c) {
  const names = c.series.map((s) => s.name);
  const aData = c.series.map((s) => s.dayA);
  const bData = c.series.map((s) => s.dayB);
  return {
    ...CHART_THEME,
    tooltip: {
      ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" },
      formatter: (ps) => {
        const s = c.series[ps[0].dataIndex];
        const sign = s.delta > 0 ? "+" : "";
        return `<b>${s.name}</b><br/>${c.dayALabel}: ${s.dayA} ${c.unit}<br/>${c.dayBLabel}: ${s.dayB} ${c.unit}<br/>Δ ${sign}${s.delta} ${c.unit}`;
      },
    },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, data: [c.dayALabel, c.dayBLabel] },
    grid: { top: 40, bottom: 60, left: 66, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis, type: "category", data: names,
      name: c.xName, nameLocation: "middle", nameGap: 34,
      axisLabel: { ...CHART_THEME.xAxis.axisLabel, interval: 0, fontSize: 10 },
    },
    yAxis: { ...CHART_THEME.yAxis, type: "value", name: c.yName, nameLocation: "middle", nameGap: 46 },
    series: [
      {
        name: c.dayALabel, type: "bar", data: aData, barGap: "12%", barWidth: "32%",
        itemStyle: { color: "rgba(31,111,235,0.85)", borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: "#38496b", fontSize: 10 },
      },
      {
        name: c.dayBLabel, type: "bar", data: bData, barWidth: "32%",
        itemStyle: { color: "rgba(6,182,212,0.8)", borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: "#38496b", fontSize: 10 },
      },
    ],
    graphic: highlightGraphic(c.highlight, { right: 50, top: 44 }),
  };
}

/* ─── E 类 · 作息模式 24h 双折线(工作日 vs 节假日/基线) ─── */
export function buildScheduleOption(c) {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}`);
  return {
    ...CHART_THEME,
    tooltip: {
      ...TOOLTIP, trigger: "axis",
      formatter: (ps) => {
        const h = ps[0].axisValue;
        const lines = ps.map((p) => `${p.marker}${p.seriesName}: ${p.value} kW`).join("<br/>");
        return `${h}:00<br/>${lines}`;
      },
    },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, data: [c.seriesA.name, c.seriesB.name] },
    grid: { top: 40, bottom: 55, left: 62, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis, type: "category", data: hours, boundaryGap: false,
      name: c.xName || "时刻 (h)", nameLocation: "middle", nameGap: 30,
      axisLabel: { ...CHART_THEME.xAxis.axisLabel, interval: 3 },
    },
    yAxis: { ...CHART_THEME.yAxis, type: "value", name: c.yName || "逐时功率 (kW)", nameLocation: "middle", nameGap: 44 },
    series: [
      {
        name: c.seriesA.name, type: "line", data: c.seriesA.data, smooth: true, showSymbol: false,
        lineStyle: { color: "#1f6feb", width: 2.5 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(31,111,235,0.22)" }, { offset: 1, color: "rgba(31,111,235,0.02)" }] } },
      },
      {
        name: c.seriesB.name, type: "line", data: c.seriesB.data, smooth: true, showSymbol: false,
        lineStyle: { color: "#06b6d4", width: 2.5, type: "dashed" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(6,182,212,0.16)" }, { offset: 1, color: "rgba(6,182,212,0.02)" }] } },
      },
    ],
    graphic: highlightGraphic(c.highlight, { right: 50, top: 44 }),
  };
}

/* ─── 分发入口:按 visualType 选 builder ─── */
export function buildChartOption(visualType, chart) {
  switch (visualType) {
    case "A": return buildClusterOption(chart);
    case "B": return buildRegressionOption(chart);
    case "C": return buildDayPairOption(chart);
    case "D": return buildDistributionOption(chart);
    case "E": return buildScheduleOption(chart);
    default: return {};
  }
}
