/* ═══════════════════════════════════════════════════════════════
   building-detail-data.js · 建筑详情页(4.3)mock 数据生成逻辑
   从原型 cx_workbench.html 迁移而来,内容未做任何改动(仅将规则元信息
   来源从 RULES_DATA 替换为 rules-meta-static.js 的 RULE_META_BY_CODE,
   原因见 rules-meta-static.js 顶部说明)。
   ═══════════════════════════════════════════════════════════════ */
import { RULE_META_BY_CODE } from "./rules-meta-static.js";

const BUILDING_META_OVERRIDES = {
  "310101A003": { area: "38,500", floors: "地上 42 · 地下 3", year: "2016",
                  chillerType: "水冷离心机组 × 4", ahuType: "全空气 VAV",
                  owner: "某综合金融集团" },
  "310101B025": { area: "82,000", floors: "地上 6 · 地下 2", year: "2018",
                  chillerType: "水冷螺杆机组 × 3", ahuType: "分区空调 + 新风",
                  owner: "某商业运营集团" },
  "310101A094": { area: "51,200", floors: "地上 28 · 地下 3", year: "2015",
                  chillerType: "水冷离心机组 × 3", ahuType: "全空气 CAV",
                  owner: "同上" },
  "310101A030": { area: "22,800", floors: "地上 16 · 地下 2", year: "2012",
                  chillerType: "水冷螺杆 × 2", ahuType: "分区空调",
                  owner: "某机关事务管理局" },
};

// 生成一栋建筑的元信息(有 override 用 override,否则按业态生成默认)
const genBuildingMeta = (bld) => {
  const override = BUILDING_META_OVERRIDES[bld.buildId];
  if (override) return override;
  const areaByFunc = { AA:"18,000", BA:"32,000", BB:"48,000", BC:"28,000",
                       BD:"15,000", BE:"38,000", BF:"22,000", BH:"25,000",
                       BI:"56,000", BJ:"85,000", BZ:"20,000" };
  return {
    area: areaByFunc[bld.buildFunc] || "20,000",
    floors: "地上 20 · 地下 2",
    year: (2010 + (parseInt(bld.buildId.slice(-3)) % 12)).toString(),
    chillerType: "常规配置",
    ahuType: "常规配置",
    owner: "未登记"
  };
};

// 节点覆盖数据(与规则的 requiredNodes 联动)
const ALL_NODES = [
  { code: "U2A00", name: "制冷主机",   category: "冷水系统" },
  { code: "U2A01", name: "冷冻泵",     category: "冷水系统" },
  { code: "U2A02", name: "冷却水泵",   category: "冷水系统" },
  { code: "U2A04", name: "冷却塔",     category: "冷水系统" },
  { code: "U2A05", name: "采暖辅助",   category: "采暖" },
  { code: "U2B01", name: "AHU 总",     category: "AHU" },
  { code: "U2B02", name: "新风机",     category: "AHU" },
  { code: "U2000", name: "总电表",     category: "计量" },
];

// 生成节点覆盖 · 大部分建筑有 6 个左右节点
const genNodeCoverage = (bld) => {
  // 用建筑ID后3位做种子,决定哪些节点缺失
  const seed = parseInt(bld.buildId.slice(-3), 10) || 1;
  const missingCount = bld.nodeCoverage === "缺失" ? 5
                     : bld.nodeCoverage === "部分" ? 3
                     : (seed % 3 === 0 ? 2 : 1);
  const missingIdx = new Set();
  for (let i = 0; i < missingCount; i++) missingIdx.add((seed * (i + 7)) % ALL_NODES.length);
  return ALL_NODES.map((n, i) => ({ ...n, available: !missingIdx.has(i) }));
};

const RULE_VALUE_MEANING = {
  "C01": [
    { key:"V1", name:"分离度",     unit:"%",  triggeredWhen:"gte", threshold:"15", desc:"两簇中心距离占均值比" },
    { key:"V2", name:"轮廓系数",   unit:"",   triggeredWhen:"gte", threshold:"0.5", desc:"聚类清晰度评分" },
    { key:"V3", name:"低簇均值",   unit:"kW", desc:"低工况平均电耗" },
    { key:"V4", name:"高簇均值",   unit:"kW", desc:"高工况平均电耗" },
    { key:"V5", name:"簇间距离",   unit:"kW", desc:"两簇中心距离" },
    { key:"V6", name:"低簇样本数", unit:"h",  desc:"归入低工况簇的小时数" },
    { key:"V7", name:"高簇样本数", unit:"h",  desc:"归入高工况簇的小时数" },
    { key:"V8", name:"温度带宽",   unit:"℃", desc:"聚类使用的干球温度范围宽度" },
  ],
  "C02": [
    { key:"V1", name:"湿球降幅",   unit:"℃", desc:"窗口内湿球下降值" },
    { key:"V2", name:"电耗变化率", unit:"%",  triggeredWhen:"gte", threshold:"-5", desc:"应为负值,持平或上涨触发" },
    { key:"V3", name:"日均干球",   unit:"℃", desc:"窗口气象背景" },
  ],
  "C03": [
    { key:"V1", name:"主机涨幅",   unit:"%", desc:"主机日电耗增幅" },
    { key:"V2", name:"冷冻泵涨幅", unit:"%", triggeredWhen:"lte", threshold:"1/3 主机", desc:"低于主机涨幅 1/3 触发" },
    { key:"V3", name:"涨幅比",     unit:"", desc:"冷冻泵/主机" },
  ],
  "C04": [
    { key:"V1", name:"变异系数 CV",  unit:"",  triggeredWhen:"lte", threshold:"0.15", desc:"标准差/均值" },
    { key:"V2", name:"max/mean 比", unit:"",  triggeredWhen:"lte", threshold:"1.20", desc:"最大值与均值比" },
    { key:"V3", name:"工频占比",     unit:"%", desc:"40-45 kW 区间小时占比" },
    { key:"V4", name:"关机占比",     unit:"%", desc:"0 kW 小时占比" },
  ],
  "C05": [
    { key:"V1", name:"冷却侧占比", unit:"%", triggeredWhen:"gte", threshold:"40", desc:"占冷水总电耗比" },
    { key:"V2", name:"平均干球",   unit:"℃", desc:"窗口高温背景" },
    { key:"V3", name:"平均湿度",   unit:"%", desc:"窗口高湿背景" },
  ],
  "C06": [
    { key:"V1", name:"max/min 比", unit:"",  triggeredWhen:"gte", threshold:"1.30", desc:"AHU 电耗离散度" },
    { key:"V2", name:"变异系数 CV",  unit:"",  triggeredWhen:"gte", threshold:"0.20", desc:"标准差/均值" },
    { key:"V3", name:"参与 AHU 数", unit:"", desc:"参与计算的 AHU 台数" },
  ],
  "C07": [
    { key:"V1", name:"室外升温",   unit:"℃", desc:"窗口气温上升值" },
    { key:"V2", name:"采暖泵降幅", unit:"%", triggeredWhen:"lte", threshold:"15", desc:"降幅低于 15% 触发" },
  ],
  "C08": [
    { key:"V1", name:"两日温差",   unit:"℃", desc:"极寒日 vs 温和日" },
    { key:"V2", name:"电耗差异",   unit:"%", triggeredWhen:"lte", threshold:"20", desc:"差异<20% 触发" },
  ],
  "D01": [
    { key:"V1", name:"R² 决定系数", unit:"", triggeredWhen:"lte", threshold:"业态差异", desc:"低于业态阈值触发" },
    { key:"V2", name:"拟合斜率",   unit:"kW/℃", desc:"每升 1℃ 的电耗涨幅" },
    { key:"V3", name:"拟合截距",   unit:"kW", desc:"基线电耗" },
    { key:"V4", name:"样本数",     unit:"", desc:"有效数据点" },
  ],
  "D02": [
    { key:"V1", name:"湿球降幅",   unit:"℃", desc:"窗口累计下降值" },
    { key:"V2", name:"冷却降幅",   unit:"%", triggeredWhen:"lte", threshold:"业态差异", desc:"低于阈值触发" },
    { key:"V3", name:"首日电耗",   unit:"kWh", desc:"" },
    { key:"V4", name:"末日电耗",   unit:"kWh", desc:"" },
  ],
  "D03": [
    { key:"V1", name:"夜间中位",   unit:"kW",  desc:"22:00-06:00 电耗中位" },
    { key:"V2", name:"白天中位",   unit:"kW",  desc:"09:00-17:00 电耗中位" },
    { key:"V3", name:"夜/日比",   unit:"%",   triggeredWhen:"gte", threshold:"业态差异", desc:"高于阈值触发" },
    { key:"V4", name:"昼夜温差",   unit:"℃",  desc:"应 ≤ 1℃" },
  ],
  "D04": [
    { key:"V1", name:"过渡季中位", unit:"kW", desc:"过渡季日电耗中位" },
    { key:"V2", name:"盛夏峰值",   unit:"kW", desc:"盛夏日电耗峰值" },
    { key:"V3", name:"过渡/盛夏比", unit:"%",  triggeredWhen:"gte", threshold:"业态差异", desc:"高于阈值触发" },
  ],
  "D05": [
    { key:"V1", name:"工作日中位", unit:"kW/日", desc:"" },
    { key:"V2", name:"节假日中位", unit:"kW/日", desc:"" },
    { key:"V3", name:"分组策略",   unit:"", desc:"业态分组下的判定方向" },
    { key:"V4", name:"实际差异",   unit:"%",  desc:"节假日相对工作日的差异" },
  ],
};

// 通用 F_Value 数据生成(基于规则和建筑生成 mock 数值)
function genValues(ruleCode, bld, windowIdx, triggered) {
  const meaning = RULE_VALUE_MEANING[ruleCode] || [
    { key:"V1", name:"指标 1", unit:"", desc:"" },
    { key:"V2", name:"指标 2", unit:"", desc:"" },
  ];
  const seed = parseInt(bld.buildId.slice(-3), 10) * (windowIdx + 1);
  const rnd = (a, b) => a + ((seed * 9301 + 49297) % 233280) / 233280 * (b - a);

  const templates = {
    "C01": [
      triggered ? "22.3" : "8.5", triggered ? "0.63" : "0.32",
      Math.round(380 + rnd(0, 40)).toString(),
      Math.round(590 + rnd(0, 40)).toString(),
      Math.round(210 + rnd(0, 30)).toString(),
      Math.round(28 + rnd(0, 8)).toString(),
      Math.round(38 + rnd(0, 10)).toString(),
      (2.4 + rnd(0, 1.2)).toFixed(1)
    ],
    "C02": [
      "-1.8", triggered ? "3.2" : "-8.5",
      (26 + rnd(0, 2)).toFixed(1)
    ],
    "C03": [
      (25 + rnd(0, 10)).toFixed(1), triggered ? (6 + rnd(0, 3)).toFixed(1) : (12 + rnd(0, 5)).toFixed(1),
      triggered ? "0.24" : "0.42"
    ],
    "C04": [
      triggered ? "0.11" : "0.22", triggered ? "1.15" : "1.42",
      triggered ? "62.9" : "34.5", triggered ? "18.7" : "22.4"
    ],
    "C05": [
      triggered ? "45.8" : "28.3", (32 + rnd(0, 2)).toFixed(1),
      (52 + rnd(0, 8)).toFixed(1)
    ],
    "C06": [
      triggered ? "1.42" : "1.15", triggered ? "0.28" : "0.14",
      Math.round(4 + rnd(0, 4)).toString()
    ],
    "C07": [
      (5 + rnd(0, 3)).toFixed(1), triggered ? (8 + rnd(0, 5)).toFixed(1) : (22 + rnd(0, 8)).toFixed(1)
    ],
    "C08": [
      (8 + rnd(0, 4)).toFixed(1), triggered ? (12 + rnd(0, 5)).toFixed(1) : (28 + rnd(0, 10)).toFixed(1)
    ],
    "D01": [
      triggered ? "0.28" : "0.62", (6 + rnd(0, 4)).toFixed(1),
      Math.round(380 + rnd(0, 100)).toString(), "140"
    ],
    "D02": [
      "3.0", triggered ? "3.5" : "12.4",
      Math.round(8500 + rnd(0, 200)).toString(),
      Math.round(8200 + rnd(0, 200)).toString()
    ],
    "D03": [
      Math.round(280 + rnd(0, 100)).toString(),
      Math.round(420 + rnd(0, 120)).toString(),
      triggered ? "76" : "45",
      "0.6"
    ],
    "D04": [
      Math.round(6800 + rnd(0, 400)).toString(),
      Math.round(9500 + rnd(0, 400)).toString(),
      triggered ? "78" : "42"
    ],
    "D05": [
      Math.round(9500 + rnd(0, 500)).toString(),
      triggered ? Math.round(8800 + rnd(0, 400)).toString() : Math.round(4200 + rnd(0, 300)).toString(),
      "间歇运营", triggered ? "7.4" : "58.3"
    ],
  };
  const values = templates[ruleCode] || meaning.map(() => "—");
  return meaning.map((m, i) => ({
    ...m,
    value: values[i] || "—",
    triggered: triggered && m.triggeredWhen  // 有阈值方向的才标为已触发
  }));
}

// 生成一栋建筑的完整规则命中详情
function genBuildingRuleResults(bld) {
  const allRuleCodes = ["C01","C02","C03","C04","C05","C06","C07","C08","D01","D02","D03","D04","D05"];
  const nodes = genNodeCoverage(bld);
  const nodesAvail = new Set(nodes.filter(n => n.available).map(n => n.code));

  return allRuleCodes.map(code => {
    const isHit = bld.hitRules.includes(code);
    // 简化:如果节点缺失关键节点,标为"无节点"
    const missingNode = (code === "C04" && !nodesAvail.has("U2A04"))
                     || (code === "C06" && !nodesAvail.has("U2B01"))
                     || (code === "C07" && !nodesAvail.has("U2A05"));
    // 判定分类
    let category;
    if (isHit) category = "目标调适";
    else if (missingNode) category = "无节点";
    else if (bld.category === "待核查" && Math.random() > 0.7) category = "待核查";
    else category = "正常";

    // 窗口数
    const validCount = missingNode ? 0 : 3;
    const triggerCount = isHit ? 3 : (category === "待核查" ? 1 : 0);

    // 生成 3 个窗口
    const windows = [];
    for (let i = 0; i < validCount; i++) {
      const isTrig = i < triggerCount;
      windows.push({
        idx: i,
        label: `窗口 ${i + 1}`,
        period: [`2025-07-15 至 07-17`, `2025-07-22 至 07-24`, `2025-07-29 至 07-31`][i],
        weather: {
          drybulb: (28 + i * 0.3).toFixed(1) + "℃",
          wetbulb: (24 + i * 0.2).toFixed(1) + "℃"
        },
        values: genValues(code, bld, i, isTrig),
        isTriggered: isTrig
      });
    }

    // 从静态规则元信息表找规则名称/系列/优先级等展示字段
    const meta = RULE_META_BY_CODE[code] || {};

    return {
      ruleCode: code,
      ruleName: meta.name || "",
      series: meta.series || (code.startsWith("C") ? "C" : "D"),
      priority: meta.priority || "中",
      category: category,
      hasChart: ["C01","D01","D02","C04"].includes(code),  // 5.2 已实现的规则
      validCount,
      triggerCount,
      detailResult: isHit
        ? `触发窗口 ${triggerCount}/${validCount} · ${meta.brief || "该规则各窗口均触发,判定为异常。"}`
        : missingNode
        ? "该规则所需的计量节点缺失,本次分析未纳入判定。"
        : category === "待核查"
        ? `触发窗口 ${triggerCount}/${validCount} · 未达到 ${meta.minPass || 2} 个触发窗口,需人工核查。`
        : "该规则所有窗口均未触发,判定为正常。",
      windows
    };
  });
}

export {
  BUILDING_META_OVERRIDES,
  genBuildingMeta,
  ALL_NODES,
  genNodeCoverage,
  RULE_VALUE_MEANING,
  genValues,
  genBuildingRuleResults,
};
