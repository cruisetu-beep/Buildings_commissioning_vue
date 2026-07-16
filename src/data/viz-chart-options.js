/* ═══════════════════════════════════════════════════════════════
   viz-chart-options.js · 4 种规则的 ECharts option 生成器
   从原型 cx_workbench.html 迁移而来,内容未做任何改动。
   ═══════════════════════════════════════════════════════════════ */
import { CHART_THEME } from "./viz-data.js";

// ─── C01 · K-means 散点(两簇着色 + 均值参考线) ───
export function buildKMeansOption(d) {
  return {
    ...CHART_THEME,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,29,61,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      formatter: (p) => `<b>${p.seriesName}</b><br/>温度: ${p.value[0]} ℃<br/>电耗: ${p.value[1]} kW`,
    },
    legend: {
      ...CHART_THEME.legend,
      top: 8, right: 20, itemGap: 24,
      data: ["低工况簇", "高工况簇", "均值参考"],
    },
    grid: { top: 40, bottom: 55, left: 68, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis,
      name: "室外干球温度 (℃)", nameLocation: "middle", nameGap: 30,
      type: "value", min: 25.5, max: 30.5, splitNumber: 6,
    },
    yAxis: {
      ...CHART_THEME.yAxis,
      name: "冷水系统电耗 (kW)", nameLocation: "middle", nameGap: 45,
      type: "value", min: 200, max: 900,
    },
    series: [
      {
        name: "低工况簇",
        type: "scatter",
        data: d.low,
        symbolSize: 9,
        itemStyle: { color: "#7a5cff", opacity: 0.72, borderColor: "#5b3fd6", borderWidth: 1 },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: "#7a5cff", type: "dashed", width: 1, opacity: 0.5 },
          label: { color: "#7a5cff", fontSize: 10, formatter: `低簇 ${d.lowMean} kW` },
          data: [{ yAxis: d.lowMean }],
        },
      },
      {
        name: "高工况簇",
        type: "scatter",
        data: d.high,
        symbolSize: 9,
        itemStyle: { color: "#2f7fff", opacity: 0.72, borderColor: "#1860d4", borderWidth: 1 },
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: "#2f7fff", type: "dashed", width: 1, opacity: 0.5 },
          label: { color: "#2f7fff", fontSize: 10, formatter: `高簇 ${d.highMean} kW` },
          data: [{ yAxis: d.highMean }],
        },
      },
      // 均值参考线(用于展示)
      {
        name: "均值参考",
        type: "line",
        showSymbol: false,
        silent: true,
        lineStyle: { color: "#d97706", type: "dotted", width: 1 },
        data: [],
      },
    ],
    graphic: [
      {
        type: "text", right: 45, top: 45,
        style: {
          text: `分离度 22.3%  ·  轮廓系数 0.63`,
          fontSize: 12, fontWeight: 600, fill: "#d97706",
          fontFamily: '"JetBrains Mono", monospace',
        },
      },
    ],
  };
}

// ─── D01 · 线性回归散点 + 拟合线 + R² 标注 ───
export function buildRegressionOption(d) {
  return {
    ...CHART_THEME,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15,29,61,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      formatter: (p) =>
        p.seriesName === "拟合直线"
          ? `<b>拟合直线</b><br/>温度: ${p.value[0]} ℃<br/>预测: ${Math.round(p.value[1])} kW`
          : `温度: ${p.value[0]} ℃<br/>电耗: ${p.value[1]} kW`,
    },
    legend: {
      ...CHART_THEME.legend,
      top: 8, right: 20,
      data: ["逐时数据点", "拟合直线"],
    },
    grid: { top: 40, bottom: 55, left: 68, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis,
      name: "室外干球温度 (℃)", nameLocation: "middle", nameGap: 30,
      type: "value", min: 18, max: 40, splitNumber: 6,
    },
    yAxis: {
      ...CHART_THEME.yAxis,
      name: "冷水系统电耗 (kW)", nameLocation: "middle", nameGap: 45,
      type: "value", min: 100, max: 900,
    },
    series: [
      {
        name: "逐时数据点",
        type: "scatter",
        data: d.points,
        symbolSize: 7,
        itemStyle: { color: "#1f6feb", opacity: 0.5, borderColor: "#1860d4", borderWidth: 0.5 },
      },
      {
        name: "拟合直线",
        type: "line",
        data: d.fitLine,
        showSymbol: false,
        smooth: false,
        lineStyle: { color: "#e54e6e", width: 2.5, type: "solid" },
        z: 3,
        markLine: {
          symbol: "none",
          silent: true,
          lineStyle: { color: "#d97706", type: "dashed", width: 1, opacity: 0.6 },
          label: {
            color: "#d97706", fontSize: 10, position: "insideEndTop",
            formatter: "业态阈值 R²≥0.45",
          },
          data: [],
        },
      },
    ],
    graphic: [
      {
        type: "group",
        right: 60, top: 45,
        children: [
          {
            type: "rect",
            shape: { width: 130, height: 52, r: 6 },
            style: { fill: "rgba(229,78,110,0.10)", stroke: "rgba(229,78,110,0.35)", lineWidth: 1 },
          },
          {
            type: "text", left: 12, top: 8,
            style: {
              text: "R² = 0.28", fontSize: 20, fontWeight: 700, fill: "#e54e6e",
              fontFamily: '"JetBrains Mono", monospace',
            },
          },
          {
            type: "text", left: 12, top: 34,
            style: {
              text: "低于阈值 0.45", fontSize: 10, fill: "#e54e6e",
              fontFamily: '"Noto Sans SC", sans-serif',
            },
          },
        ],
      },
    ],
  };
}

// ─── D02 · 双 Y 轴对比(湿球折线 + 电耗柱状) ───
export function buildDualBarOption(d) {
  return {
    ...CHART_THEME,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15,29,61,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      axisPointer: { type: "shadow" },
    },
    legend: {
      ...CHART_THEME.legend,
      top: 8, right: 20,
      data: ["湿球温度", "冷却系统电耗"],
    },
    grid: { top: 50, bottom: 50, left: 68, right: 68 },
    xAxis: {
      ...CHART_THEME.xAxis,
      type: "category",
      data: d.days.map((x) => x.date),
      name: "日期", nameLocation: "middle", nameGap: 30,
    },
    yAxis: [
      {
        ...CHART_THEME.yAxis,
        type: "value",
        name: "湿球温度 (℃)", nameLocation: "middle", nameGap: 45,
        position: "left",
        min: 20, max: 28,
        splitLine: { show: false },
      },
      {
        ...CHART_THEME.yAxis,
        type: "value",
        name: "电耗 (kWh)", nameLocation: "middle", nameGap: 55,
        position: "right",
        min: 7500, max: 9000,
      },
    ],
    series: [
      {
        name: "湿球温度",
        type: "line",
        yAxisIndex: 0,
        data: d.days.map((x) => x.wetBulb),
        smooth: false,
        symbol: "circle",
        symbolSize: 10,
        itemStyle: { color: "#0ea5e9", borderColor: "#fff", borderWidth: 2 },
        lineStyle: { color: "#0ea5e9", width: 2.5 },
        label: {
          show: true,
          position: "top",
          formatter: "{c} ℃",
          color: "#0ea5e9", fontSize: 11, fontWeight: 600,
        },
        z: 3,
      },
      {
        name: "冷却系统电耗",
        type: "bar",
        yAxisIndex: 1,
        data: d.days.map((x) => x.cooling),
        barWidth: 60,
        itemStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "#2f7fff" }, { offset: 1, color: "#1f6feb" }],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: "top",
          formatter: (p) => p.value.toLocaleString(),
          color: "#1f6feb", fontSize: 11, fontWeight: 600,
        },
      },
    ],
    graphic: [
      {
        type: "group",
        right: 90, top: 55,
        children: [
          {
            type: "rect",
            shape: { width: 150, height: 52, r: 6 },
            style: { fill: "rgba(217,119,6,0.10)", stroke: "rgba(217,119,6,0.32)", lineWidth: 1 },
          },
          {
            type: "text", left: 12, top: 8,
            style: {
              text: "实际降幅 3.5%",
              fontSize: 14, fontWeight: 700, fill: "#d97706",
              fontFamily: '"JetBrains Mono", monospace',
            },
          },
          {
            type: "text", left: 12, top: 30,
            style: {
              text: "低于阈值 10%",
              fontSize: 10, fill: "#d97706",
            },
          },
        ],
      },
    ],
  };
}

// ─── C04 · 直方图(带均值/工频区标注) ───
export function buildHistogramOption(d) {
  return {
    ...CHART_THEME,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15,29,61,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 11 },
      axisPointer: { type: "shadow" },
    },
    legend: {
      ...CHART_THEME.legend,
      top: 8, right: 20,
      data: ["小时数分布"],
    },
    grid: { top: 40, bottom: 60, left: 60, right: 30 },
    xAxis: {
      ...CHART_THEME.xAxis,
      type: "category",
      data: d.histogram.map((x) => x.range),
      name: "冷却塔电耗区间 (kW)", nameLocation: "middle", nameGap: 32,
      axisLabel: { ...CHART_THEME.xAxis.axisLabel, interval: 0 },
    },
    yAxis: {
      ...CHART_THEME.yAxis,
      type: "value",
      name: "小时数",
      nameLocation: "middle", nameGap: 42,
    },
    series: [
      {
        name: "小时数分布",
        type: "bar",
        data: d.histogram.map((x, i) => ({
          value: x.count,
          itemStyle: {
            // 关机、工频区用强调色,中间区用弱色以突出"双峰"
            color:
              i === 0
                ? "#94a3b8"
                : i === 8 || i === 9
                ? {
                    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: "#06b6d4" }, { offset: 1, color: "#0891b2" }],
                  }
                : "rgba(6,182,212,0.42)",
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: "72%",
        label: {
          show: true, position: "top",
          color: "#38496b", fontSize: 10,
          formatter: (p) => (p.value > 5 ? p.value : ""),
        },
      },
    ],
    graphic: [
      {
        type: "group",
        right: 40, top: 45,
        children: [
          {
            type: "rect",
            shape: { width: 210, height: 76, r: 6 },
            style: { fill: "rgba(6,182,212,0.08)", stroke: "rgba(6,182,212,0.30)", lineWidth: 1 },
          },
          {
            type: "text", left: 12, top: 8,
            style: {
              text: "变异系数 CV = 0.11",
              fontSize: 12, fontWeight: 600, fill: "#0891b2",
              fontFamily: '"JetBrains Mono", monospace',
            },
          },
          {
            type: "text", left: 12, top: 30,
            style: {
              text: "max/mean = 1.15",
              fontSize: 12, fontWeight: 600, fill: "#0891b2",
              fontFamily: '"JetBrains Mono", monospace',
            },
          },
          {
            type: "text", left: 12, top: 54,
            style: {
              text: "双峰分布 · 无变频",
              fontSize: 10, fill: "#0891b2",
            },
          },
        ],
      },
    ],
  };
}
