/* ═══════════════════════════════════════════════════════════════
   viz-data.js · 计算过程可视化(RuleVizModal)mock 数据
   ───────────────────────────────────────────────────────────────
   v4 方案改造:规则不再"一条一套图",而是按 5 种可视化类型(A~E)组织。
   每条规则挂一个 visualType,窗口数据统一放在 resultJSON 里:
     resultJSON = {
       visualType,
       chart:      {...按类型的图表数据 + annotation 文本行},   // 左侧图表
       metrics:    [{label,value,unit,threshold,triggered,info}], // 右侧指标面板
       category:   "目标调适" | "正常" | ...,                     // 结论卡触发态
       reason:     "结论文本",                                    // 结论卡文本
       windowInfo: { "分析窗口":"...", ... },                     // 窗口概览面板("分析窗口"由 win() 注入)
     }
   后端 CalcResult/ResultJSON 接口尚未提供,故此层仍为 mock;接口就绪后
   只需把 getVizRule 换成接口取数并做一层 v4→本结构的适配。
   ───────────────────────────────────────────────────────────────
   批次进度:批次1 覆盖 A/B/D 三类共 5 条(C01/D01/D02/C04/C06);
            C 类(批次2)、E 类(批次3)随后补齐。
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

/* ───────────────────────────────────────────────────────────────
   规则 → 可视化类型映射(按 RuleCode,跨文档稳定;不用 CxRuleID,因
   两份新文档对 S 系 CxRuleID 编号不一致)
   A 聚类 · B 回归 · C 日对对比 · D 分布统计 · E 作息模式
   ─────────────────────────────────────────────────────────────── */
export const VISUAL_TYPE_MAP = {
  C01: "A",
  D01: "B", D02: "B",
  C02: "C", C03: "C", C05: "C", C07: "C", C08: "C", D03: "C", D04: "C",
  C04: "D", C06: "D",
  D05: "E",
};
// S 系专项规则全部归 E 类(批次3 填充示例数据)
["AA-S1","AA-S2","AA-S3","BA-S1","BA-S2","BB-S1","BB-S2","BC-S1","BC-S2",
 "BD-S1","BD-S2","BE-S1","BE-S2","BF-S1","BF-S2","BH-S1","BH-S2",
 "BI-S1","BI-S2","BJ-S1","BJ-S2"].forEach((c) => { VISUAL_TYPE_MAP[c] = "E"; });

export const VIZ_TYPE_LABEL = {
  A: "聚类分析", B: "回归拟合", C: "日对对比", D: "分布统计", E: "作息模式",
};

// 小工具:构造一个窗口对象;"分析窗口"字段统一在此注入,避免各处重复。
const win = (period, drybulb, wetbulb, resultJSON) => ({
  period,
  weather: { drybulb, wetbulb },
  resultJSON: {
    ...resultJSON,
    windowInfo: { "分析窗口": period, ...(resultJSON.windowInfo || {}) },
  },
});

/* ═══════════════════════════════════════════════════════════════
   A 类 · C01 同气象双工况(K-means 聚类)· 腾飞元创大厦
   ═══════════════════════════════════════════════════════════════ */
const c01mk = (seed, clusterDiff, silhouette) => {
  const rnd = makeRnd(seed);
  const low = [], high = [];
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
  const triggered = clusterDiff >= 15 && silhouette >= 0.5;
  return {
    visualType: "A",
    chart: {
      low, high, lowMean, highMean,
      xMin: 25.5, xMax: 30.5, yMin: 200, yMax: 900,
      xName: "室外干球温度 (℃)", yName: "冷水系统电耗 (kW)",
      annotation: [`双工况分离度 ${clusterDiff}%`, `轮廓系数 ${silhouette}`],
    },
    metrics: [
      { label: "双工况分离度", value: clusterDiff.toFixed(1), unit: "%", threshold: "≥ 15%", triggered, info: "两簇中心距离占均值比" },
      { label: "轮廓系数", value: silhouette.toFixed(2), unit: "", threshold: "≥ 0.5", triggered, info: "聚类清晰度评分" },
      { label: "低工况均值", value: lowMean.toString(), unit: "kW", info: "低工况簇平均电耗" },
      { label: "高工况均值", value: highMean.toString(), unit: "kW", info: "高工况簇平均电耗" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason: triggered
      ? `在同温度 ±1℃ 区间内,电耗明确分为两簇,分离度 ${clusterDiff}% 超过阈值 15%,轮廓系数 ${silhouette} 表明聚类边界清晰。判定为存在高低双工况,推测控制策略存在分层运行或冗余机组。`
      : `两簇分离度 ${clusterDiff}% 未达阈值 15%,电耗随气象连续变化,未见明显双工况。`,
    windowInfo: {
      "有效样本": "105 个(剔除关机时段)",
      "温度区间": "26.0 - 30.0 ℃",
    },
  };
};
const C01_WINDOWS = [
  win("2025-07-15 至 07-17", "28.2℃", "24.8℃", c01mk(42, 22.3, 0.63)),
  win("2025-07-22 至 07-24", "29.1℃", "25.2℃", c01mk(51, 19.6, 0.58)),
  win("2025-07-29 至 07-31", "27.6℃", "24.1℃", c01mk(63, 17.8, 0.54)),
];

/* ═══════════════════════════════════════════════════════════════
   B 类 · D01 能耗强度(EUI)限额(线性回归 R²)· 中区广场商场
   ═══════════════════════════════════════════════════════════════ */
const d01mk = (seed, r2) => {
  const rnd = makeRnd(seed);
  const points = [];
  for (let i = 0; i < 140; i++) {
    const t = 20 + rnd() * 18;
    const p = 380 + (t - 20) * 6 + (rnd() - 0.5) * 340;
    points.push([+t.toFixed(2), Math.round(p)]);
  }
  const fitLine = [[20, 380], [38, 380 + 18 * 6]];
  const triggered = r2 < 0.45;
  return {
    visualType: "B",
    chart: {
      points, fitLine,
      xMin: 18, xMax: 40, yMin: 100, yMax: 900,
      xName: "室外干球温度 (℃)", yName: "冷水系统电耗 (kW)",
      pointName: "逐时数据点", lineName: "拟合直线",
      highlight: { value: `R² = ${r2}`, sub: triggered ? "低于阈值 0.45" : "达标", color: triggered ? "warn" : "ok" },
    },
    metrics: [
      { label: "R² 决定系数", value: r2.toFixed(2), unit: "", threshold: "≥ 0.45", triggered, info: "线性回归拟合优度(BB 商场业态)" },
      { label: "拟合斜率", value: "6.2", unit: "kW/℃", info: "每升 1℃ 的电耗涨幅" },
      { label: "拟合截距", value: "380", unit: "kW", info: "基线电耗" },
      { label: "样本数", value: "140", unit: "", info: "有效数据点" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason: triggered
      ? `电耗与室外干球温度的线性相关性 R² = ${r2},显著低于 BB 商场业态阈值 0.45。数据点分布散乱,表明设备温度感知能力不足,可能存在恒定运行或过度冗余。建议核查冷水系统的负荷响应策略。`
      : `R² = ${r2} 达到业态阈值 0.45,电耗与气温相关性良好。`,
    windowInfo: {
      "有效样本": "140 个",
      "温度区间": "20.0 - 38.0 ℃",
      "业态阈值": "BB 商场 R² ≥ 0.45",
    },
  };
};
const D01_WINDOWS = [
  win("2025-07-22 至 07-24", "29.4℃", "25.6℃", d01mk(88, 0.28)),
  win("2025-08-05 至 08-07", "31.0℃", "26.1℃", d01mk(97, 0.34)),
];

/* ═══════════════════════════════════════════════════════════════
   B 类 · D02 能学签名斜率(冷却电耗 vs 湿球回归)· 华旭国际大厦
   湿球下降时冷却侧电耗几乎不降 → 回归斜率接近 0(无降载)
   ═══════════════════════════════════════════════════════════════ */
const d02mk = (seed, dropPct) => {
  const rnd = makeRnd(seed);
  const points = [];
  for (let i = 0; i < 72; i++) {
    const wb = 22 + rnd() * 4;
    const p = 8300 + (wb - 22) * 40 + (rnd() - 0.5) * 220;
    points.push([+wb.toFixed(2), Math.round(p)]);
  }
  const fitLine = [[22, 8300], [26, 8300 + 4 * 40]];
  const triggered = dropPct < 10;
  return {
    visualType: "B",
    chart: {
      points, fitLine,
      xMin: 21.5, xMax: 26.5, yMin: 7900, yMax: 8800,
      xName: "室外湿球温度 (℃)", yName: "冷却侧电耗 (kWh/日)",
      pointName: "逐时数据点", lineName: "签名斜率",
      highlight: { value: `降幅 ${dropPct}%`, sub: triggered ? "低于阈值 10%" : "达标", color: triggered ? "warn" : "ok" },
    },
    metrics: [
      { label: "湿球降幅", value: "3.0", unit: "℃", info: "窗口内湿球累计下降" },
      { label: "冷却系统降幅", value: dropPct.toFixed(1), unit: "%", threshold: "≥ 10%", triggered, info: "BA 商业办公阈值" },
      { label: "签名斜率", value: "40", unit: "kWh/℃", info: "冷却电耗对湿球的响应斜率" },
      { label: "样本数", value: "72", unit: "", info: "有效逐时点" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason: triggered
      ? `湿球温度累计下降 3.0℃,冷却侧电耗仅下降 ${dropPct}%,远低于 BA 商业办公业态阈值 10%。签名斜率接近 0,表明冷却塔/冷却水泵未随湿球下降降载,推测无变频或定频运行。`
      : `冷却降幅 ${dropPct}% 达标,冷却侧随湿球响应正常。`,
    windowInfo: {
      "湿球下降": "25.5 → 22.5 ℃(降 3.0 ℃)",
      "设备类别": "冷却塔 + 冷却水泵(U2A02, U2A04)",
      "业态阈值": "BA 商业办公 降幅 ≥ 10%",
    },
  };
};
const D02_WINDOWS = [
  win("2025-08-05 至 08-07", "30.1℃", "24.0℃", d02mk(120, 3.5)),
  win("2025-08-12 至 08-14", "29.6℃", "23.6℃", d02mk(131, 4.8)),
];

/* ═══════════════════════════════════════════════════════════════
   D 类 · C04 冷却塔无变频(电耗分布直方图 · 双峰)· 花园饭店
   ═══════════════════════════════════════════════════════════════ */
const c04mk = (cv, maxMean) => {
  const buckets = [
    { range: "0", count: 26 }, { range: "5-10", count: 3 }, { range: "10-15", count: 2 },
    { range: "15-20", count: 3 }, { range: "20-25", count: 4 }, { range: "25-30", count: 6 },
    { range: "30-35", count: 8 }, { range: "35-40", count: 24 }, { range: "40-45", count: 68 },
    { range: "45-50", count: 12 },
  ];
  const triggered = cv < 0.15 && maxMean < 1.20;
  return {
    visualType: "D",
    chart: {
      buckets,
      xName: "冷却塔电耗区间 (kW)", yName: "小时数",
      emphasisIdx: [8, 9], zeroIdx: 0,
      annotation: [`变异系数 CV = ${cv}`, `max/mean = ${maxMean}`, "双峰分布 · 无变频"],
    },
    metrics: [
      { label: "变异系数 CV", value: cv.toFixed(2), unit: "", threshold: "< 0.15", triggered, info: "标准差/均值" },
      { label: "max/mean 比", value: maxMean.toFixed(2), unit: "", threshold: "< 1.20", triggered, info: "最大值与均值比" },
      { label: "工频占比", value: "62.9", unit: "%", info: "40-45 kW 区间小时占比" },
      { label: "关机占比", value: "18.7", unit: "%", info: "0 kW 小时占比" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason: triggered
      ? `冷却塔电耗集中在 40-45 kW(工频)与 0 kW(关机)两端,中间过渡区极少。变异系数 ${cv} < 阈值 0.15,max/mean ${maxMean} < 阈值 1.20,判定为仅有启停两档、无变频控制。建议增加变频调节或分级控制。`
      : `电耗分布连续,CV ${cv} 未触发,存在负荷调节能力。`,
    windowInfo: {
      "有效样本": "68 个(剔除维修时段)",
      "关机小时": "26 小时",
      "运行小时": "42 小时",
    },
  };
};
const C04_WINDOWS = [
  win("2025-07-08 至 07-10", "28.4℃", "24.2℃", c04mk(0.11, 1.15)),
  win("2025-07-15 至 07-17", "29.0℃", "24.6℃", c04mk(0.13, 1.18)),
];

/* ═══════════════════════════════════════════════════════════════
   D 类 · C06 AHU 离散度极大(各 AHU 电耗分布)· 中区广场办公楼
   ═══════════════════════════════════════════════════════════════ */
const c06mk = (cv, maxMin) => {
  const buckets = [
    { range: "0-40", count: 1 }, { range: "40-80", count: 2 }, { range: "80-120", count: 3 },
    { range: "120-160", count: 2 }, { range: "160-200", count: 1 }, { range: "200-240", count: 1 },
    { range: "240-280", count: 1 }, { range: "280-320", count: 1 },
  ];
  const triggered = maxMin >= 1.30 && cv >= 0.20;
  return {
    visualType: "D",
    chart: {
      buckets,
      xName: "单台 AHU 日均电耗 (kWh)", yName: "AHU 台数",
      emphasisIdx: [0, 7], zeroIdx: -1,
      annotation: [`max/min = ${maxMin}`, `变异系数 CV = ${cv}`, "AHU 负荷严重不均"],
    },
    metrics: [
      { label: "max/min 比", value: maxMin.toFixed(2), unit: "", threshold: "≥ 1.30", triggered, info: "AHU 电耗离散度" },
      { label: "变异系数 CV", value: cv.toFixed(2), unit: "", threshold: "≥ 0.20", triggered, info: "标准差/均值" },
      { label: "参与 AHU 数", value: "12", unit: "台", info: "参与计算的 AHU 台数" },
      { label: "最大/最小", value: "312 / 36", unit: "kWh", info: "单台日均电耗极值" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason: triggered
      ? `12 台 AHU 日均电耗离散度极大,max/min ${maxMin} 超过阈值 1.30,变异系数 ${cv} 超过 0.20。表明各分区风系统负荷严重不均,可能存在风阀失调、局部过量送风或部分 AHU 长期空转。建议核查风系统平衡与分区控制。`
      : `AHU 间电耗较均衡,离散度 ${maxMin} 未触发。`,
    windowInfo: {
      "参与 AHU": "12 台",
      "电耗极值": "312 / 36 kWh",
    },
  };
};
const C06_WINDOWS = [
  win("2025-07-15 至 07-17", "28.2℃", "24.8℃", c06mk(0.28, 1.42)),
  win("2025-07-22 至 07-24", "29.1℃", "25.0℃", c06mk(0.24, 1.36)),
];

/* ───────────────────────────────────────────────────────────────
   规则清单(仅含已有 resultJSON 数据的规则;批次逐步补齐)
   每项:{ code, name, visualType, buildId, buildingName, windows[] }
   ─────────────────────────────────────────────────────────────── */
export const VIZ_RULES = [
  { code: "C01", name: "同气象双工况", visualType: "A", buildId: "310101A003", buildingName: "腾飞元创大厦", windows: C01_WINDOWS },
  { code: "D01", name: "能耗强度(EUI)限额", visualType: "B", buildId: "310101B025", buildingName: "中区广场商场", windows: D01_WINDOWS },
  { code: "D02", name: "能学签名斜率", visualType: "B", buildId: "310101G023", buildingName: "华旭国际大厦", windows: D02_WINDOWS },
  { code: "C04", name: "冷却塔无变频", visualType: "D", buildId: "310101C002", buildingName: "花园饭店", windows: C04_WINDOWS },
  { code: "C06", name: "AHU 离散度极大", visualType: "D", buildId: "310101A094", buildingName: "中区广场办公楼", windows: C06_WINDOWS },
];

const VIZ_RULE_BY_CODE = Object.fromEntries(VIZ_RULES.map((r) => [r.code, r]));

/** 取某规则的可视化配置;无数据返回 null。 */
export function getVizRule(code) {
  return VIZ_RULE_BY_CODE[code] || null;
}

/** 该规则当前是否有可展示的计算过程图表(决定"计算过程"按钮是否出现)。 */
export function hasVizChart(code) {
  return !!VIZ_RULE_BY_CODE[code];
}

// ─── 逐时原始数据 · 用于"数据"视图折叠展开 ───
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
