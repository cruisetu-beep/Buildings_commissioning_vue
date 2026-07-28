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

// 温度档位(占位用;真实计算条件由后端接口返回)
const tempBand = (db) => {
  const t = parseFloat(db);
  if (isNaN(t)) return "";
  if (t < 12) return "低温";
  if (t <= 26) return "中温";
  return "高温";
};

// 小工具:构造一个窗口对象;"分析窗口"字段统一在此注入,避免各处重复。
// condition = 计算条件(占位:有干球时按气象生成,否则给对比日标签;后端就绪后替换)。
const win = (period, drybulb, wetbulb, resultJSON) => ({
  period,
  weather: { drybulb, wetbulb },
  condition:
    drybulb && drybulb !== "—"
      ? `等温窗 · ${tempBand(drybulb)} t≈${drybulb}`
      : "邻近气象对比日",
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

/* ═══════════════════════════════════════════════════════════════
   C 类 · 日对对比(分组柱)· 批次2 · C02/C03/C05/C07/C08/D03/D04
   ═══════════════════════════════════════════════════════════════ */
// 组装一条 dayPair resultJSON。deltaEta 用小数(0.038 = 3.8%);
// metricLabel/hlPrefix 让"变化率/比值/差异"型指标各自贴切表述。
const dayPairRJ = ({
  series, unit = "kWh", dayALabel, dayBLabel,
  meteoVar, meteoA, meteoB, meteoUnit = "℃",
  deltaEta, etaThreshold, etaCompare = "≤",
  metricLabel = "能耗变化率 Δη", hlPrefix = "Δη",
  triggered, reason, extraInfo,
}) => {
  const totalA = series.reduce((s, x) => s + x.dayA, 0);
  const totalB = series.reduce((s, x) => s + x.dayB, 0);
  const etaPct = (deltaEta * 100).toFixed(1);
  const thrPct = (etaThreshold * 100).toFixed(0);
  return {
    visualType: "C",
    chart: {
      series, unit, dayALabel, dayBLabel,
      xName: "设备分项", yName: `能耗 (${unit})`,
      highlight: {
        value: `${hlPrefix} = ${etaPct}%`,
        sub: triggered ? `未达阈值 ${etaCompare} ${thrPct}%` : "达标",
        color: triggered ? "warn" : "ok",
      },
    },
    metrics: [
      { label: `${meteoVar}变化`, value: `${meteoA} → ${meteoB}`, unit: meteoUnit, info: `${dayALabel} → ${dayBLabel}` },
      { label: metricLabel, value: etaPct, unit: "%", threshold: `${etaCompare} ${thrPct}%`, triggered, info: "相关侧能耗变化" },
      { label: `${dayALabel} 合计`, value: totalA.toString(), unit, info: "Day A 分项合计" },
      { label: `${dayBLabel} 合计`, value: totalB.toString(), unit, info: "Day B 分项合计" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason,
    windowInfo: {
      "Day A": dayALabel, "Day B": dayBLabel,
      [`${meteoVar}对比`]: `${meteoA} → ${meteoB} ${meteoUnit}`,
      ...(extraInfo || {}),
    },
  };
};

// C02 · 湿球拐点电耗无响应(散热侧 U2A00/U2A02/U2A04)· 湿球降但能耗不降
const C02_WINDOWS = [
  win("2025-07-10 / 07-12", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷热站", dayA: 1240, dayB: 1232, delta: -8 },
      { name: "U2A02 冷却泵", dayA: 198, dayB: 196, delta: -2 },
      { name: "U2A04 冷却塔", dayA: 65, dayB: 64, delta: -1 },
    ],
    dayALabel: "降温前 07-10", dayBLabel: "降温后 07-12",
    meteoVar: "湿球", meteoA: 26.3, meteoB: 24.1,
    deltaEta: -0.007, etaThreshold: -0.05, triggered: true,
    reason: "湿球温度下降 2.2℃,散热侧能耗仅下降 0.7%,远未达到 -5% 的预期降幅。冷却塔/冷却泵未随湿球下降降载,判定为对湿球拐点无响应,推测冷却侧缺乏变频或联动控制。",
    extraInfo: { "湿球降幅": "2.2℃(≥1.5℃ 满足触发前置)" },
  })),
  win("2025-08-02 / 08-04", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷热站", dayA: 1210, dayB: 1188, delta: -22 },
      { name: "U2A02 冷却泵", dayA: 190, dayB: 186, delta: -4 },
      { name: "U2A04 冷却塔", dayA: 62, dayB: 60, delta: -2 },
    ],
    dayALabel: "降温前 08-02", dayBLabel: "降温后 08-04",
    meteoVar: "湿球", meteoA: 25.8, meteoB: 23.9,
    deltaEta: -0.019, etaThreshold: -0.05, triggered: true,
    reason: "湿球下降 1.9℃,散热侧能耗仅降 1.9%,仍低于 -5% 预期。散热侧对湿球响应不足。",
    extraInfo: { "湿球降幅": "1.9℃" },
  })),
];

// C03 · 冷冻泵涨幅不足 · 负荷上升(干球升)时冷冻泵能耗涨幅偏小
const C03_WINDOWS = [
  win("2025-07-18 / 07-21", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷热站", dayA: 980, dayB: 1180, delta: 200 },
      { name: "U2A01 冷冻泵", dayA: 210, dayB: 218, delta: 8 },
    ],
    dayALabel: "低负荷 07-18", dayBLabel: "高负荷 07-21",
    meteoVar: "干球", meteoA: 28.0, meteoB: 33.2,
    deltaEta: 0.038, etaThreshold: 0.15, etaCompare: "≥",
    metricLabel: "冷冻泵涨幅", triggered: true,
    reason: "干球升高 5.2℃、冷机能耗上涨 20%,冷冻泵能耗却仅上涨 3.8%,未达 ≥15% 的预期涨幅。冷冻水流量未随负荷同步增加,疑似冷冻泵定频运行或阀门限位。",
  })),
  win("2025-08-08 / 08-11", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷热站", dayA: 1020, dayB: 1210, delta: 190 },
      { name: "U2A01 冷冻泵", dayA: 216, dayB: 230, delta: 14 },
    ],
    dayALabel: "低负荷 08-08", dayBLabel: "高负荷 08-11",
    meteoVar: "干球", meteoA: 29.1, meteoB: 33.8,
    deltaEta: 0.065, etaThreshold: 0.15, etaCompare: "≥",
    metricLabel: "冷冻泵涨幅", triggered: true,
    reason: "负荷上升时冷冻泵涨幅 6.5%,仍低于 15% 阈值,流量响应不足。",
  })),
];

// C05 · 高湿工况冷却侧能耗激增(冷却占比异常)
const C05_WINDOWS = [
  win("2025-07-14 / 07-25", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 1100, dayB: 1130, delta: 30 },
      { name: "U2A02 冷却泵", dayA: 150, dayB: 320, delta: 170 },
      { name: "U2A04 冷却塔", dayA: 55, dayB: 140, delta: 85 },
    ],
    dayALabel: "常湿日 07-14", dayBLabel: "高湿日 07-25",
    meteoVar: "湿球", meteoA: 22.0, meteoB: 26.2,
    deltaEta: 1.24, etaThreshold: 0.40, metricLabel: "冷却侧能耗变化率",
    triggered: true,
    reason: "高湿工况下冷却侧(冷却泵+冷却塔)能耗激增 124%,而冷机仅变化 2.7%。冷却侧变化远超 40% 阈值,散热与制冷负荷严重失衡,疑似冷却塔逼近度过大或冷却水温设定不当。",
  })),
  win("2025-08-06 / 08-19", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 1140, dayB: 1175, delta: 35 },
      { name: "U2A02 冷却泵", dayA: 158, dayB: 300, delta: 142 },
      { name: "U2A04 冷却塔", dayA: 60, dayB: 128, delta: 68 },
    ],
    dayALabel: "常湿日 08-06", dayBLabel: "高湿日 08-19",
    meteoVar: "湿球", meteoA: 22.4, meteoB: 25.9,
    deltaEta: 0.96, etaThreshold: 0.40, metricLabel: "冷却侧能耗变化率",
    triggered: true,
    reason: "高湿日冷却侧能耗上升 96%,超过 40% 阈值,冷却侧失衡持续存在。",
  })),
];

// C07 · 冬季升温采暖降幅弱 · 干球回升采暖不降载
const C07_WINDOWS = [
  win("2026-01-08 / 01-12", "—", "—", dayPairRJ({
    series: [
      { name: "采暖热源", dayA: 890, dayB: 862, delta: -28 },
      { name: "热水循环泵", dayA: 120, dayB: 118, delta: -2 },
    ],
    dayALabel: "低温日 01-08", dayBLabel: "回暖日 01-12",
    meteoVar: "干球", meteoA: 4.0, meteoB: 9.5,
    deltaEta: -0.031, etaThreshold: -0.12, triggered: true,
    reason: "室外干球回升 5.5℃,采暖侧能耗仅下降 3.1%,未达 -12% 预期降幅。采暖机组未随气温回升降载,疑似供水温度定值运行、缺乏气候补偿。",
  })),
  win("2026-01-20 / 01-24", "—", "—", dayPairRJ({
    series: [
      { name: "采暖热源", dayA: 910, dayB: 872, delta: -38 },
      { name: "热水循环泵", dayA: 124, dayB: 121, delta: -3 },
    ],
    dayALabel: "低温日 01-20", dayBLabel: "回暖日 01-24",
    meteoVar: "干球", meteoA: 3.2, meteoB: 8.1,
    deltaEta: -0.041, etaThreshold: -0.12, triggered: true,
    reason: "干球回升 4.9℃,采暖降幅 4.1%,仍显著低于 12% 预期。",
  })),
];

// C08 · 冬日采暖差距 · 相近气温两日采暖能耗差距过大
const C08_WINDOWS = [
  win("2026-01-15 / 01-17", "—", "—", dayPairRJ({
    series: [
      { name: "采暖热源", dayA: 720, dayB: 1010, delta: 290 },
      { name: "热水循环泵", dayA: 110, dayB: 145, delta: 35 },
    ],
    dayALabel: "01-15", dayBLabel: "01-17",
    meteoVar: "干球", meteoA: 3.5, meteoB: 3.2,
    deltaEta: 0.40, etaThreshold: 0.15, etaCompare: "≤",
    metricLabel: "两日采暖差", hlPrefix: "差异", triggered: true,
    reason: "两日室外干球相近(3.5 / 3.2℃),采暖能耗却相差 40%,远超 15% 的合理波动区间。采暖运行不稳定,疑似夜间未回落或存在无效供热时段。",
  })),
  win("2026-02-03 / 02-05", "—", "—", dayPairRJ({
    series: [
      { name: "采暖热源", dayA: 760, dayB: 995, delta: 235 },
      { name: "热水循环泵", dayA: 115, dayB: 140, delta: 25 },
    ],
    dayALabel: "02-03", dayBLabel: "02-05",
    meteoVar: "干球", meteoA: 2.8, meteoB: 3.0,
    deltaEta: 0.31, etaThreshold: 0.15, etaCompare: "≤",
    metricLabel: "两日采暖差", hlPrefix: "差异", triggered: true,
    reason: "气温相近两日采暖能耗差 31%,仍超 15% 阈值,采暖控制不稳定。",
  })),
];

// D03 · 梅雨季能效异常 · 相近湿球相邻两日空调电耗差距大
const D03_WINDOWS = [
  win("2025-06-18 / 06-19", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 640, dayB: 910, delta: 270 },
      { name: "U2B01 AHU", dayA: 210, dayB: 240, delta: 30 },
    ],
    dayALabel: "06-18", dayBLabel: "06-19",
    meteoVar: "湿球", meteoA: 24.5, meteoB: 24.8,
    deltaEta: 0.38, etaThreshold: 0.18, etaCompare: "≤",
    metricLabel: "两日能效差", hlPrefix: "差异", triggered: true,
    reason: "梅雨季相邻两日湿球温度接近(24.5 / 24.8℃),空调电耗却相差 38%,能效表现异常波动,疑似除湿再热策略或新风控制紊乱。",
  })),
  win("2025-06-26 / 06-27", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 680, dayB: 900, delta: 220 },
      { name: "U2B01 AHU", dayA: 220, dayB: 246, delta: 26 },
    ],
    dayALabel: "06-26", dayBLabel: "06-27",
    meteoVar: "湿球", meteoA: 24.9, meteoB: 25.1,
    deltaEta: 0.31, etaThreshold: 0.18, etaCompare: "≤",
    metricLabel: "两日能效差", hlPrefix: "差异", triggered: true,
    reason: "湿球接近两日空调电耗差 31%,超 18% 阈值,梅雨季能效不稳。",
  })),
];

// D04 · 过渡季/盛夏比过高 · 过渡季典型日能耗接近盛夏
const D04_WINDOWS = [
  win("2025-10-15 / 2025-08-08", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 520, dayB: 980, delta: 460 },
      { name: "U2B01 AHU", dayA: 180, dayB: 250, delta: 70 },
      { name: "U2A04 冷却塔", dayA: 40, dayB: 120, delta: 80 },
    ],
    dayALabel: "过渡季 10-15", dayBLabel: "盛夏 08-08",
    meteoVar: "干球", meteoA: 24.1, meteoB: 33.4,
    deltaEta: 0.548, etaThreshold: 0.35, etaCompare: "≤",
    metricLabel: "过渡季/盛夏比", hlPrefix: "比值", triggered: true,
    reason: "过渡季典型日空调能耗达盛夏典型日的 54.8%,远超 35% 的合理上限。过渡季本应低负荷,却维持高能耗,疑似机组常开、经济器/免费冷却未启用。",
  })),
  win("2025-04-20 / 2025-08-08", "—", "—", dayPairRJ({
    series: [
      { name: "U2A00 冷机", dayA: 500, dayB: 980, delta: 480 },
      { name: "U2B01 AHU", dayA: 172, dayB: 250, delta: 78 },
      { name: "U2A04 冷却塔", dayA: 36, dayB: 120, delta: 84 },
    ],
    dayALabel: "过渡季 04-20", dayBLabel: "盛夏 08-08",
    meteoVar: "干球", meteoA: 23.6, meteoB: 33.4,
    deltaEta: 0.517, etaThreshold: 0.35, etaCompare: "≤",
    metricLabel: "过渡季/盛夏比", hlPrefix: "比值", triggered: true,
    reason: "春季过渡日能耗达盛夏 51.7%,超过 35% 上限,过渡季节能空间大。",
  })),
];

/* ═══════════════════════════════════════════════════════════════
   E 类 · 作息模式(24h 双折线)· 批次3 · D05 + S 系示例
   ═══════════════════════════════════════════════════════════════ */
// 组装一条 schedule resultJSON。residualRate 用小数(0.66 = 66%)。
const scheduleRJ = ({
  profileA, profileB, labelA = "工作日", labelB = "节假日",
  residualRate, threshold, triggered, avgA, avgB, group,
  residualInfo = "节假日/工作日 日均比", reason, extraInfo,
}) => {
  const pct = (residualRate * 100).toFixed(0);
  const thr = (threshold * 100).toFixed(0);
  return {
    visualType: "E",
    chart: {
      seriesA: { name: labelA, data: profileA },
      seriesB: { name: labelB, data: profileB },
      xName: "时刻 (h)", yName: "逐时功率 (kW)",
      highlight: {
        value: `残留率 ${pct}%`,
        sub: triggered ? `超阈值 ${thr}%` : `低于阈值 ${thr}%`,
        color: triggered ? "warn" : "ok",
      },
    },
    metrics: [
      { label: `${labelA} 日均`, value: avgA.toString(), unit: "kWh", info: `${labelA}逐时功率日累计` },
      { label: `${labelB} 日均`, value: avgB.toString(), unit: "kWh", info: `${labelB}逐时功率日累计` },
      { label: "残留率 R", value: pct, unit: "%", threshold: `≤ ${thr}%`, triggered, info: residualInfo },
      { label: "作息分组", value: group, unit: "", info: "业态作息分组阈值" },
    ],
    category: triggered ? "目标调适" : "正常",
    reason,
    windowInfo: { "作息分组": group, "残留率": `${pct}%(阈值 ≤ ${thr}%)`, ...(extraInfo || {}) },
  };
};

// D05 · 工作日/周末/节假日差异 · 节假日维持高功耗(残留率超阈值)
const D05_WINDOWS = [
  win("2025-07-02(周三)/ 07-06(周日)", "—", "—", scheduleRJ({
    profileA: [18, 16, 15, 16, 22, 45, 90, 140, 175, 190, 195, 190, 180, 178, 188, 196, 192, 175, 140, 95, 60, 40, 28, 20],
    profileB: [30, 28, 26, 28, 42, 72, 112, 128, 138, 142, 144, 140, 134, 132, 140, 144, 142, 130, 112, 88, 62, 50, 42, 34],
    labelA: "工作日 07-02", labelB: "周日 07-06",
    residualRate: 0.66, threshold: 0.50, triggered: true,
    avgA: 125, avgB: 82, group: "间歇运营(BA)",
    reason: "BA 商业办公按'间歇运营'分组,周日日均功率达工作日的 66%,残留率 66% 远超 50% 阈值。节假日本应大幅降载,却维持高功耗,判定为存在无效运行,疑似空调/照明未按作息停机。",
    extraInfo: { "同温匹配": "工作日 32.1℃ / 周日 31.8℃(Δ0.3 ≤ 1.5,可比)" },
  })),
  win("2025-08-13(周三)/ 08-15(节假日)", "—", "—", scheduleRJ({
    profileA: [18, 16, 15, 16, 22, 45, 90, 140, 175, 190, 195, 190, 180, 178, 188, 196, 192, 175, 140, 95, 60, 40, 28, 20],
    profileB: [26, 24, 22, 24, 36, 64, 100, 116, 124, 128, 130, 126, 120, 118, 126, 130, 128, 116, 100, 78, 55, 44, 36, 30],
    labelA: "工作日 08-13", labelB: "节假日 08-15",
    residualRate: 0.58, threshold: 0.50, triggered: true,
    avgA: 130, avgB: 75, group: "间歇运营(BA)",
    reason: "节假日日均达工作日 58%,残留率仍超 50% 阈值,节假日降载不足。",
    extraInfo: { "同温匹配": "Δ0.5℃(可比)" },
  })),
];

// S 系专项 · 共享示例(21 条 S 规则共用一套 E 类作息示例;各自数据待后端接入)
// 说明:v4 表里 BJ-S2 标注为 D 类,但按"S 系整体挂一个 E 类示例"的约定,此处统一用 E。
const S_EXAMPLE_WINDOWS = [
  win("典型运营日 / 应有基线", "—", "—", scheduleRJ({
    profileA: [80, 78, 76, 78, 82, 90, 120, 150, 165, 170, 168, 150, 148, 160, 168, 165, 150, 140, 135, 130, 120, 110, 95, 85],
    profileB: [20, 18, 16, 18, 25, 45, 95, 145, 165, 170, 168, 145, 145, 158, 166, 163, 145, 120, 90, 55, 35, 28, 24, 22],
    labelA: "实际运行", labelB: "应有基线",
    residualRate: 0.72, threshold: 0.40, triggered: true,
    avgA: 128, avgB: 95, group: "作息专项(示例)",
    residualInfo: "非营业时段功率残留比",
    reason: "【S 系专项示例数据】S 系规则用于识别特定业态的作息异常(如下班无断崖下跌、节假日维持功耗、午休/凌晨无降载等)。示例中实际运行曲线在非营业时段仍维持约 72% 的基线功率,残留率超 40% 阈值,判定异常。各 S 规则的真实计算数据待后端 CalcResult 接口接入。",
    extraInfo: { "数据来源": "示例(占位)" },
  })),
  win("典型运营日(缓和)/ 应有基线", "—", "—", scheduleRJ({
    profileA: [60, 58, 56, 58, 64, 78, 115, 148, 163, 168, 166, 148, 146, 158, 166, 162, 148, 135, 120, 100, 85, 72, 66, 62],
    profileB: [20, 18, 16, 18, 25, 45, 95, 145, 165, 170, 168, 145, 145, 158, 166, 163, 145, 120, 90, 55, 35, 28, 24, 22],
    labelA: "实际运行", labelB: "应有基线",
    residualRate: 0.55, threshold: 0.40, triggered: true,
    avgA: 118, avgB: 92, group: "作息专项(示例)",
    residualInfo: "非营业时段功率残留比",
    reason: "【S 系专项示例数据】第二窗口示例,非营业时段残留率 55%,仍超 40% 阈值。",
    extraInfo: { "数据来源": "示例(占位)" },
  })),
];

// 21 条 S 规则编码与名称(来自 v4 §7.5 全量映射表)
const S_RULE_META = [
  ["AA-S1", "机关-下班无断崖下跌"], ["AA-S2", "机关-节假日维持功耗"], ["AA-S3", "机关-午休风机无降载"],
  ["BA-S1", "办公-夜间无低负荷"], ["BA-S2", "办公-周末满负荷"],
  ["BB-S1", "商场-停业后下降小"], ["BB-S2", "商场-新风恒定高功耗"],
  ["BC-S1", "酒店-凌晨冷冻泵未降"], ["BC-S2", "酒店-热水循环泵固定"],
  ["BD-S1", "文化-闭馆日满负荷"], ["BD-S2", "文化-活动后高风量"],
  ["BE-S1", "医疗-凌晨新风无分级"], ["BE-S2", "医疗-过渡季不降输配"],
  ["BF-S1", "体育-无赛事日差距小"], ["BF-S2", "体育-泳池泵恒定"],
  ["BH-S1", "教育-寒暑假全天运行"], ["BH-S2", "教育-课间午休无降载"],
  ["BI-S1", "会展-空置期24h不断"], ["BI-S2", "会展-预冷不随温湿度调"],
  ["BJ-S1", "交通-凌晨低客流无降"], ["BJ-S2", "交通-冷却塔仅启停"],
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
  { code: "C02", name: "湿球拐点电耗无响应", visualType: "C", buildId: "310101A003", buildingName: "腾飞元创大厦", windows: C02_WINDOWS },
  { code: "C03", name: "冷冻泵涨幅不足", visualType: "C", buildId: "310101B025", buildingName: "中区广场商场", windows: C03_WINDOWS },
  { code: "C05", name: "高湿冷却占比", visualType: "C", buildId: "310101B025", buildingName: "中区广场商场", windows: C05_WINDOWS },
  { code: "C07", name: "冬季升温采暖降幅弱", visualType: "C", buildId: "310101A010", buildingName: "市民服务中心", windows: C07_WINDOWS },
  { code: "C08", name: "冬日采暖差距", visualType: "C", buildId: "310101A010", buildingName: "市民服务中心", windows: C08_WINDOWS },
  { code: "D03", name: "梅雨季能效异常", visualType: "C", buildId: "310101B025", buildingName: "中区广场商场", windows: D03_WINDOWS },
  { code: "D04", name: "过渡季/盛夏比", visualType: "C", buildId: "310101A003", buildingName: "腾飞元创大厦", windows: D04_WINDOWS },
  { code: "D05", name: "工作日周末节假日差异", visualType: "E", buildId: "310101G023", buildingName: "华旭国际大厦", windows: D05_WINDOWS },
  ...S_RULE_META.map(([code, name]) => ({
    code, name, visualType: "E", buildId: "—", buildingName: "S 系专项示例", windows: S_EXAMPLE_WINDOWS, isSample: true,
  })),
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
