/* ═══════════════════════════════════════════════════════════════
   threshold-matrix-data.js · 业态阈值矩阵(2.1)静态数据
   从原型 cx_workbench.html 的 DEFAULT_THRESHOLDS / THRESHOLD_RULE_META /
   AFFECTED_COUNT / FUNC_LIST / RULE_LIST 迁移而来,内容未做任何改动。
   ═══════════════════════════════════════════════════════════════ */

// 出厂默认阈值(D 系 5 条规则 × 11 业态)
export const DEFAULT_THRESHOLDS = {
  D01: { AA:"0.50", BA:"0.50", BB:"0.45", BC:"0.35", BD:"0.45",
         BE:"0.35", BF:"0.40", BH:"0.45", BI:"0.40", BJ:"0.40", BZ:"0.50" },
  D02: { AA:"10",   BA:"10",   BB:"10",   BC:"7",    BD:"8",
         BE:"7",    BF:"9",    BH:"8",    BI:"9",    BJ:"9",    BZ:"10" },
  D03: { AA:"60",   BA:"65",   BB:"70",   BC:"85",   BD:"70",
         BE:"88",   BF:"75",   BH:"65",   BI:"70",   BJ:"80",   BZ:"70" },
  D04: { AA:"50",   BA:"55",   BB:"80",   BC:"75",   BD:"60",
         BE:"80",   BF:"70",   BH:"60",   BI:"65",   BJ:"70",   BZ:"60" },
  D05: { AA:"间歇",       BA:"间歇",       BB:"客流上涨", BC:"24h连续", BD:"活动驱动",
         BE:"24h连续",     BF:"客流上涨", BH:"寒暑假",   BI:"活动驱动", BJ:"24h连续", BZ:"间歇" }
};

// 阈值规则的元数据(单位、类型、校验范围、下拉选项)
export const THRESHOLD_RULE_META = {
  D01: { name: "电耗-温度相关性", short: "R² 相关性", unit: "", suffix: "",
         type: "number", min: 0, max: 1, step: 0.01,
         direction: "≥", desc: "低于此值判定为异常",
         color: "var(--text-0)" },
  D02: { name: "湿球降冷却降幅",  short: "冷却降幅",  unit: "%", suffix: "%",
         type: "number", min: 0, max: 100, step: 1,
         direction: "≥", desc: "湿球降 2℃ 时至少应有的降幅",
         color: "var(--text-0)" },
  D03: { name: "同气象昼夜比",    short: "夜/日 比",  unit: "%", suffix: "%",
         type: "number", min: 0, max: 100, step: 1,
         direction: "≤", desc: "夜间/白天电耗比上限,超过判异常",
         color: "var(--text-0)" },
  D04: { name: "过渡季/盛夏比",   short: "过渡季比",  unit: "%", suffix: "%",
         type: "number", min: 0, max: 100, step: 1,
         direction: "≤", desc: "过渡季/盛夏电耗比上限",
         color: "var(--text-0)" },
  D05: { name: "假日分组策略",    short: "假日分组",  unit: "策略", suffix: "",
         type: "select",
         options: ["间歇", "客流上涨", "24h连续", "活动驱动", "寒暑假", "不参与"],
         desc: "工作日/周末/节假日的判定策略",
         color: "var(--text-0)" },
};

// Mock:每个阈值影响的建筑数(用于悬停显示)—— 待后端提供真实统计接口后替换
export const AFFECTED_COUNT = {
  D01: { AA:12, BA:41, BB:23, BC:8,  BD:6,  BE:9,  BF:4,  BH:15, BI:3, BJ:2, BZ:18 },
  D02: { AA:10, BA:35, BB:20, BC:8,  BD:5,  BE:9,  BF:4,  BH:12, BI:3, BJ:2, BZ:14 },
  D03: { AA:12, BA:38, BB:22, BC:8,  BD:6,  BE:9,  BF:4,  BH:14, BI:3, BJ:2, BZ:16 },
  D04: { AA:11, BA:36, BB:21, BC:7,  BD:5,  BE:8,  BF:4,  BH:13, BI:3, BJ:2, BZ:15 },
  D05: { AA:12, BA:41, BB:23, BC:8,  BD:6,  BE:9,  BF:4,  BH:15, BI:3, BJ:2, BZ:18 },
};

export const FUNC_LIST = ["AA","BA","BB","BC","BD","BE","BF","BH","BI","BJ","BZ"];
export const RULE_LIST = ["D01","D02","D03","D04","D05"];
