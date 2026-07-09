const RULE_MANUAL = {
  "D01": {
    judgment: "电耗与室外温度的线性回归 |R²| 低于业态阈值,即认为设备温度感知能力不足或存在低效恒定运行。",
    method: [
      "选取分析窗口内的所有小时数据(逐时电耗 vs 室外干球温度)",
      "剔除设备关机时段(电耗 < 窗口最大值的 5%)",
      "剔除极端异常值(3σ 或 IQR 法)",
      "对剩余数据点计算线性回归 R²",
      "|R²| < 业态阈值 → 该窗口触发"
    ],
    window: "制冷季:干球温度 25-35℃ 内连续 3 天(至少 4 个窗口)。采暖季:干球温度 -5~5℃ 内连续 3 天。",
    nodes: [
      { period: "制冷", req: "U2A01(冷冻泵) 或 U2A02(冷却水泵) 或 U2A00(制冷主机)" },
      { period: "采暖", req: "U2A01(采暖泵) 或 U2A05(采暖辅助)" }
    ],
    differentiation: "24h 连续运行的酒店(BC)和医疗(BE)业态由于基线负荷高,阈值降至 0.35。"
  },
  "C01": {
    judgment: "同等气象工况下,设备电耗存在明显的高低双工况(分层差值 ≥15%),表明控制策略存在分层运行或存在冗余机组。",
    method: [
      "选取同温度 ±1℃ 区间的所有小时数据",
      "对该区间的电耗数据进行 K-means (k=2) 聚类",
      "计算两簇之间的中心距离(分离度)",
      "计算轮廓系数(Silhouette)",
      "分离度 ≥ 15% 且轮廓系数 > 0.5 → 触发"
    ],
    window: "制冷季选取干球 26-30℃ 内的所有小时,至少覆盖 3 天。",
    nodes: [
      { period: "全时段", req: "U2A01 > U2A02 > U2A00 > U2A04 > U2B01(按优先级取第一个存在的节点)" }
    ],
    differentiation: "全业态统一阈值,不做业态差异化。"
  },
  "D05": {
    judgment: "工作日 / 周末 / 节假日之间的耗电差异不符合业态运营规律。三种业态类型有不同的判定方向。",
    method: [
      "统计全年工作日、周末、法定节假日的日均电耗中位数",
      "根据业态所属分组,判断电耗差异方向:",
      "间歇运营类:节假日应显著下降(降幅 ≥40%)",
      "客流上涨类:节假日应显著上升(涨幅 ≥40%)",
      "24h 连续类:节假日应基本持平(±15% 以内)"
    ],
    window: "全年数据,按日聚合;节假日至少 5 天。",
    nodes: [
      { period: "全时段", req: "U2A01(输配) 或 U2A02(冷却) 或 U2B01(AHU)" }
    ],
    differentiation: "AA/BA/AA→间歇 · BB/BF→客流上涨 · BC/BE/BJ→24h连续 · BD/BI→活动驱动(需人工核查)"
  },
  "C06": {
    judgment: "同温区间同时段的多个 AHU(或多天同一 AHU)的电耗离散度过大,表明末端设备控制策略不统一或存在故障机。",
    method: [
      "选取同温 ±1℃ 区间、同时段(通常 9:00-17:00)的 AHU 小时电耗",
      "计算 max / min 比值",
      "同时计算变异系数 CV",
      "max/min > 1.30 且 CV > 0.20 → 触发"
    ],
    window: "制冷季 3 天以上;每天至少覆盖 6 小时同温区间数据。",
    nodes: [
      { period: "全时段", req: "U2B01(AHU总) > U2B02(新风机)" }
    ],
    differentiation: "全业态统一阈值。"
  },
};

// 默认手册模板(其余规则使用)
const DEFAULT_MANUAL = (rule) => ({
  judgment: rule.brief,
  method: [
    "根据自动选窗策略选取有效数据窗口",
    "对窗口内的逐时数据进行指标计算",
    "对比业态阈值,判断是否触发"
  ],
  window: `最少 ${rule.minValid} 个有效窗口,触发窗口数 ≥ ${rule.minPass} 时判定为该规则触发。`,
  nodes: [{ period: "全时段", req: rule.nodeReq }],
  differentiation: rule.series === "D" ? "阈值按业态差异化。" : rule.series === "S" ? "S 系规则针对指定业态(见规则代码前缀)。" : "全业态统一阈值。"
});

const getManual = (rule) => RULE_MANUAL[rule.ruleCode] || DEFAULT_MANUAL(rule);
export { RULE_MANUAL, DEFAULT_MANUAL, getManual };
