/* ═══════════════════════════════════════════════════════════════
   viz-chart-options.js · 按可视化类型生成 ECharts option
   ───────────────────────────────────────────────────────────────
   v4 方案:一类一个 builder,统一读 resultJSON.chart(数据自带语义,
   不再依赖外部 V1~V5 映射)。buildChartOption 按 visualType 分发。
   批次1:A 聚类 / B 回归 / D 分布;C(批次2)、E(批次3)随后补齐。
   ═══════════════════════════════════════════════════════════════ */
const CHART_THEME = {
  color: ["#2f7fff", "#7a5cff", "#0ea5e9", "#10b981", "#f97316", "#e54e6e", "#06b6d4", "#8b5cf6"],
  backgroundColor: "transparent",
  textStyle: {
    fontFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
    color: "#38496b",
  },
  title: {
    textStyle: { color: "#0f1d3d", fontSize: 13, fontWeight: 600 },
    subtextStyle: { color: "#6a7da3", fontSize: 11 },
  },
  legend: {
    textStyle: { color: "#38496b", fontSize: 12 },
    itemGap: 20, itemWidth: 14, itemHeight: 8,
  },
  xAxis: {
    axisLine: { lineStyle: { color: "rgba(60,110,200,0.18)" } },
    axisLabel: { color: "#6a7da3", fontSize: 11 },
    nameTextStyle: { color: "#38496b", fontSize: 11, padding: [8, 0, 0, 0] },
    splitLine: { show: true, lineStyle: { color: "rgba(60,110,200,0.06)" } },
  },
  yAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#6a7da3", fontSize: 11 },
    nameTextStyle: { color: "#38496b", fontSize: 11, padding: [0, 0, 8, 0] },
    splitLine: { show: true, lineStyle: { color: "rgba(60,110,200,0.06)" } },
  },
};

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
  const lowLabel = c.lowLabel;
  const highLabel = c.highLabel;

  return {
    ...CHART_THEME,
    tooltip: {
      ...TOOLTIP, trigger: "item",
      formatter: (p) => `<b>${p.seriesName}</b><br/>温度: ${p.value[0]} ℃<br/>电耗: ${p.value[1]} kW`,
    },
    legend: { ...CHART_THEME.legend, top: 8, right: 20, itemGap: 24, data: [lowLabel, highLabel] },
    grid: { top: 40, bottom: 55, left: 68, right: 70 },
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
        name: lowLabel, type: "scatter", data: c.low, symbolSize: 9,
        itemStyle: { color: "#7a5cff", opacity: 0.72, borderColor: "#5b3fd6", borderWidth: 1 },
        markLine: {
          symbol: "none", silent: true,
          lineStyle: { color: "#7a5cff", type: "dashed", width: 1, opacity: 0.5 },
          label: {
            color: "#7a5cff", fontSize: 10,
            position: "insideEndTop",
            formatter: `低簇 ${c.lowMean} kW`
          },
          data: [{ yAxis: c.lowMean }],
        },
      },
      {
        name: highLabel, type: "scatter", data: c.high, symbolSize: 9,
        itemStyle: { color: "#2f7fff", opacity: 0.72, borderColor: "#1860d4", borderWidth: 1 },
        markLine: {
          symbol: "none", silent: true,
          lineStyle: { color: "#2f7fff", type: "dashed", width: 1, opacity: 0.5 },
          label: {
            color: "#2f7fff", fontSize: 10,
            position: "insideEndTop",
            formatter: `高簇 ${c.highMean} kW`
          },
          data: [{ yAxis: c.highMean }],
        },
      },
    ],
    graphic: highlightGraphic(c.highlight, { right: 50, top: 44 }),
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
  const maxCount = Math.max(...c.buckets.map(b => b.count || 0), 0);
  const yMax = maxCount > 0 ? Math.ceil(maxCount * 1.2) : undefined;

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
    yAxis: { 
      ...CHART_THEME.yAxis, type: "value", 
      name: c.yName, nameLocation: "middle", nameGap: 42,
      max: yMax
    },
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
    graphic: highlightGraphic(c.highlight, { right: 50, top: 44 }),
  };
}

/* ─── C 类 · 日对对比分组柱(Day A vs Day B 按设备分项) ─── */
export function buildDayPairOption(c) {
  const names = c.series.map((s) => s.name);
  const aData = c.series.map((s) => s.dayA);
  const bData = c.series.map((s) => s.dayB);

  const maxVal = Math.max(...aData, ...bData, 0);
  const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.3) : undefined;

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
    yAxis: {
      ...CHART_THEME.yAxis, type: "value",
      name: c.yName, nameLocation: "middle", nameGap: 46,
      max: yMax
    },
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

  const allVals = [...(c.seriesA?.data || []), ...(c.seriesB?.data || [])].map(v => parseFloat(v) || 0);
  const maxVal = Math.max(...allVals, 0);
  const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.2) : undefined;

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
    yAxis: {
      ...CHART_THEME.yAxis, type: "value",
      name: c.yName || "逐时功率 (kW)", nameLocation: "middle", nameGap: 44,
      max: yMax
    },
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

/* ─── 分发入口:按 visualType 选 builder (具备强力防崩安全过滤) ─── */
export function buildChartOption(visualType, chart) {
  if (!chart || Object.keys(chart).length === 0) {
    return { grid: {} };
  }

  try {
    switch (visualType) {
      case "A":
        if (!chart.low || !chart.high) return { grid: {} };
        return buildClusterOption(chart);
      case "B":
        if (!chart.points) return { grid: {} };
        return buildRegressionOption(chart);
      case "C":
        if (!chart.series) return { grid: {} };
        return buildDayPairOption(chart);
      case "D":
        if (!chart.buckets) return { grid: {} };
        return buildDistributionOption(chart);
      case "E":
        if (!chart.seriesA || !chart.seriesB) return { grid: {} };
        return buildScheduleOption(chart);
      default:
        return { grid: {} };
    }
  } catch (err) {
    console.error("ECharts build option crash prevented:", err);
    return { grid: {} };
  }
}
