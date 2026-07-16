/* ═══════════════════════════════════════════════════════════════
   viz-data.js · 计算过程可视化(RuleVizModal)mock 数据
   从原型 cx_workbench.html 迁移而来,内容未做任何改动。
   第一批仅覆盖 C01 / D01 / D02 / C04 四条规则的图表数据。
   ═══════════════════════════════════════════════════════════════ */

export const CHART_THEME = {
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

// ─── 固定种子伪随机(保证每次刷新数据一致) ───
const makeRnd = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

// ─── C01 K-means 双工况 · 散点图 ───
const C01_DATA = (() => {
  const rnd = makeRnd(42);
  const low = []; // 低工况簇
  const high = []; // 高工况簇
  for (let i = 0; i < 50; i++) {
    const t = 26 + rnd() * 4;
    const p = 340 + rnd() * 100 + (t - 26) * 12;
    low.push([+t.toFixed(2), Math.round(p)]);
  }
  for (let i = 0; i < 55; i++) {
    const t = 26 + rnd() * 4;
    const p = 550 + rnd() * 100 + (t - 26) * 15;
    high.push([+t.toFixed(2), Math.round(p)]);
  }
  const lowMean = Math.round(low.reduce((a, x) => a + x[1], 0) / low.length);
  const highMean = Math.round(high.reduce((a, x) => a + x[1], 0) / high.length);
  return {
    buildId: "310101A003", buildingName: "腾飞元创大厦",
    windowLabel: "1/3 · 2025-07-15 至 07-17", windowIdx: 0,
    low, high, lowMean, highMean,
    metrics: [
      { label: "分离度", value: "22.3", unit: "%", threshold: "≥ 15%", triggered: true, info: "两簇中心距离占均值比" },
      { label: "轮廓系数", value: "0.63", unit: "", threshold: "≥ 0.5", triggered: true, info: "聚类清晰度评分" },
      { label: "低簇均值", value: lowMean.toString(), unit: "kW", info: "低工况平均电耗" },
      { label: "高簇均值", value: highMean.toString(), unit: "kW", info: "高工况平均电耗" },
    ],
    windowInfo: {
      "分析窗口": "2025-07-15 至 2025-07-17",
      "样本总数": "72 小时",
      "有效样本": "105 个(剔除关机时段)",
      "温度区间": "26.0 - 30.0 ℃",
      "日均干球": "28.2 ℃",
      "日均湿球": "24.8 ℃",
    },
    triggered: true,
    conclusion:
      "在同温度 ±1℃ 区间内,电耗数据明确分为两簇,分离度 22.3% 超过阈值 15%,轮廓系数 0.63 表明聚类边界清晰。判定为存在高低双工况,推测控制策略存在分层运行或存在冗余机组。",
  };
})();

// ─── D01 R² 线性回归 · 散点 + 拟合线 ───
const D01_DATA = (() => {
  const rnd = makeRnd(88);
  const points = [];
  for (let i = 0; i < 140; i++) {
    const t = 20 + rnd() * 18; // 20~38 ℃
    // 弱相关性(噪声占主导)
    const p = 380 + (t - 20) * 6 + (rnd() - 0.5) * 340;
    points.push([+t.toFixed(2), Math.round(p)]);
  }
  // 拟合线(简单线性:y = 6x + 320)
  const fitLine = [[20, 380 + 0 * 6], [38, 380 + 18 * 6]];
  return {
    buildId: "310101B025", buildingName: "中区广场商场",
    windowLabel: "2/3 · 2025-07-22 至 07-24", windowIdx: 0,
    points, fitLine,
    metrics: [
      { label: "R² 决定系数", value: "0.28", unit: "", threshold: "≥ 0.45", triggered: true, info: "线性回归拟合优度(BB商场业态)" },
      { label: "拟合斜率", value: "6.2", unit: "kW/℃", info: "每升 1℃ 的电耗涨幅" },
      { label: "拟合截距", value: "380", unit: "kW", info: "基线电耗" },
      { label: "样本数", value: "140", unit: "", info: "有效数据点" },
    ],
    windowInfo: {
      "分析窗口": "2025-07-22 至 2025-07-24",
      "样本总数": "72 小时",
      "有效样本": "140 个",
      "温度区间": "20.0 - 38.0 ℃",
      "剔除策略": "关机时段 + 3σ 异常值",
      "业态阈值": "BB 商场 R² ≥ 0.45",
    },
    triggered: true,
    conclusion:
      "电耗与室外干球温度的线性相关性 R² = 0.28,显著低于 BB 商场业态阈值 0.45。数据点分布散乱,表明设备温度感知能力不足,可能存在恒定运行或过度冗余。建议核查冷水系统的负荷响应策略。",
  };
})();

// ─── D02 湿球降温冷却降幅 · 双柱对比 + 湿球折线 ───
const D02_DATA = {
  buildId: "310101G023", buildingName: "华旭国际大厦",
  windowLabel: "1/3 · 2025-08-05 至 08-07", windowIdx: 0,
  days: [
    { date: "08-05", wetBulb: 25.5, cooling: 8500 },
    { date: "08-06", wetBulb: 24.0, cooling: 8380 },
    { date: "08-07", wetBulb: 22.5, cooling: 8200 },
  ],
  metrics: [
    { label: "湿球降幅", value: "3.0", unit: "℃", info: "第 1 日 → 第 3 日" },
    { label: "冷却系统降幅", value: "3.5", unit: "%", threshold: "≥ 10%", triggered: true, info: "BA 商业办公阈值" },
    { label: "首日电耗", value: "8,500", unit: "kWh" },
    { label: "末日电耗", value: "8,200", unit: "kWh" },
  ],
  windowInfo: {
    "分析窗口": "2025-08-05 至 2025-08-07",
    "湿球下降": "25.5 → 22.5 ℃(降 3.0 ℃)",
    "对比方式": "首日 vs 末日",
    "设备类别": "冷却塔 + 冷却水泵(U2A02, U2A04)",
    "业态阈值": "BA 商业办公 降幅 ≥ 10%",
    "实际降幅": "3.5%",
  },
  triggered: true,
  conclusion:
    "湿球温度 3 天累计下降 3.0℃,冷却侧电耗仅下降 3.5%,远低于 BA 商业办公业态阈值 10%。表明冷却塔和冷却水泵未随湿球下降而降载,推测为无变频控制或水泵定频运行。",
};

// ─── C04 冷却塔无变频 · 电耗分布直方图 ───
const C04_DATA = {
  buildId: "310101C002", buildingName: "花园饭店",
  windowLabel: "1/3 · 2025-07-08 至 07-10", windowIdx: 0,
  histogram: [
    { range: "0", count: 26 },
    { range: "5-10", count: 3 },
    { range: "10-15", count: 2 },
    { range: "15-20", count: 3 },
    { range: "20-25", count: 4 },
    { range: "25-30", count: 6 },
    { range: "30-35", count: 8 },
    { range: "35-40", count: 24 },
    { range: "40-45", count: 68 },
    { range: "45-50", count: 12 },
  ],
  metrics: [
    { label: "变异系数 CV", value: "0.11", unit: "", threshold: "< 0.15", triggered: true, info: "标准差/均值" },
    { label: "max/mean 比", value: "1.15", unit: "", threshold: "< 1.20", triggered: true, info: "最大值与均值比" },
    { label: "工频占比", value: "62.9", unit: "%", info: "40-45 kW 区间小时占比" },
    { label: "关机占比", value: "18.7", unit: "%", info: "0 kW 小时占比" },
  ],
  windowInfo: {
    "分析窗口": "2025-07-08 至 2025-07-10",
    "样本总数": "72 小时",
    "有效样本": "68 个(剔除维修时段)",
    "关机小时": "26 小时",
    "运行小时": "42 小时",
    "工频运行": "68 小时 40-45 kW 区间",
  },
  triggered: true,
  conclusion:
    "冷却塔电耗集中分布在 40-45 kW 区间(工频)与 0 kW 区间(关机)两端,中间过渡区数据极少。变异系数 0.11 < 阈值 0.15,max/mean 1.15 < 阈值 1.20,判定为仅存在启停两档、无变频控制。建议增加变频调节或匹配负荷需求的分级控制。",
};

// ─── 逐时原始数据 · 用于折叠展开 ───
export const RAW_HOURLY_DATA = (() => {
  const rnd = makeRnd(7);
  const arr = [];
  for (let d = 15; d <= 17; d++) {
    for (let h = 0; h < 24; h++) {
      const t = 25 + Math.sin((h / 24) * Math.PI * 2 - Math.PI / 2) * 4 + rnd() * 0.5;
      const wb = t - 3 - rnd() * 2;
      const isBusy = h >= 8 && h <= 18;
      const p = isBusy ? 400 + rnd() * 250 : h < 6 || h > 22 ? 0 : 80 + rnd() * 100;
      arr.push({
        time: `2025-07-${d.toString().padStart(2, "0")} ${h.toString().padStart(2, "0")}:00`,
        drybulb: +t.toFixed(1),
        wetbulb: +wb.toFixed(1),
        power: Math.round(p),
        status: p === 0 ? "关机" : isBusy ? "运行" : "低负荷",
      });
    }
  }
  return arr;
})();

// ─── 规则可视化的元数据表 · 决定选择器和图表类型的映射 ───
export const VIZ_RULES = [
  { code: "C01", name: "同气象双工况(K-means 聚类)", chartType: "kmeans", data: C01_DATA },
  { code: "D01", name: "电耗-温度相关性(线性回归)", chartType: "regression", data: D01_DATA },
  { code: "D02", name: "湿球降冷却降幅(双柱对比)", chartType: "dualbar", data: D02_DATA },
  { code: "C04", name: "冷却塔电耗分布(直方图)", chartType: "histogram", data: C04_DATA },
];

export const VIZ_RULES_PLACEHOLDER = [
  { code: "C02", name: "湿球拐点电耗无响应" },
  { code: "C03", name: "升温冷冻泵涨幅不足" },
  { code: "C05", name: "高湿冷却占比异常" },
  { code: "C06", name: "AHU 离散度极大" },
  { code: "C07", name: "冬季升温采暖降幅弱" },
  { code: "C08", name: "冬日采暖差距过小" },
  { code: "D03", name: "同气象昼夜比" },
  { code: "D04", name: "过渡季高耗电" },
  { code: "D05", name: "假日耗电差异" },
];
