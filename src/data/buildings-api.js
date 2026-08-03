/* ═══════════════════════════════════════════════════════════════
   buildings-api.js · 判定结果模块(建筑清单)数据访问层
   ───────────────────────────────────────────────────────────────
   接口约定与 rules-api.js / threshold-matrix-api.js 保持一致
   (httpGet + /api/ 前缀 + 请求超时)。后端尚未提供本模块接口时,
   自动降级为本地 mock 数据(buildings-data.js),页面仍可正常使用。
   ═══════════════════════════════════════════════════════════════ */

const API_PREFIX = "/api/CxRuleResult";
const REQUEST_TIMEOUT_MS = 8000;

async function httpGet(url, params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      query.append(key, params[key]);
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}${queryString}`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  } finally {
    clearTimeout(timer);
  }
}

/** 获取可供录入的已计算建筑列表 */
export async function fetchCalcBuildings() {
  try {
    const data = await httpGet(`${API_PREFIX}/getCalcBuildingList`);
    return data || [];
  } catch (error) {
    console.error("fetchCalcBuildings failed:", error);
    return [];
  }
}

/** 获取大楼业态映射字典 (F_ItemCode -> F_ItemName) */
export async function fetchFuncDict() {
  try {
    const data = await httpGet(`${API_PREFIX}/getFuncDict`);
    return data || {};
  } catch (error) {
    console.error("fetchFuncDict failed:", error);
    return {};
  }
}

/** 获取建筑资源包基本信息与附件 */
export async function fetchBuildingResources(buildId) {
  try {
    return await httpGet(`${API_PREFIX}/getBuildingResources`, { buildId });
  } catch (error) {
    console.error("fetchBuildingResources failed:", error);
    return null;
  }
}

/** 获取所有规则元数据 */
export async function fetchRuleMetas() {
  try {
    const data = await httpGet(`${API_PREFIX}/getRuleMetas`);
    return data || [];
  } catch (error) {
    console.error("fetchRuleMetas failed:", error);
    return [];
  }
}

/** 获取指定大楼、指定年份的真实计算步骤流水 */
export async function fetchBuildingCalcSteps(buildId, year = 2025) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingCalcSteps`, { buildId, year });
    return data || [];
  } catch (error) {
    console.error("fetchBuildingCalcSteps failed:", error);
    return [];
  }
}

/** 获取建筑清单(按分析年份)。 */
export async function fetchBuildings(params = {}) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingList`, params);
    const list = data || [];
    // 演示:?allrules=1 时给末尾 3 栋楼打上新判定类别,便于验证 4.1 色卡/筛选(可删除)
    if (isAllRulesPreview() && list.length >= 3) {
      const cats = ["配置错误", "数据异常", "虚拟预测愈合"];
      cats.forEach((cat, i) => { list[list.length - 1 - i].category = cat; });
    }
    return list;
  } catch (error) {
    console.error("fetchBuildings failed:", error);
    return [];
  }
}

/** 保存大楼计算结果（将 T_ST_CxRuleMainResult 的 F_State 更新为 1） */
export async function saveBuildingCxResult(buildId) {
  try {
    const response = await fetch(`${API_PREFIX}/saveBuildingCxResult?buildId=${encodeURIComponent(buildId)}`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.success || result.data === true;
  } catch (error) {
    console.error("saveBuildingCxResult failed:", error);
    return false;
  }
}

/* ───────────────────────────────────────────────────────────────
   【演示辅助 · 可随时移除】URL 带 ?allrules=1 时,把当前建筑缺失的
   viz 规则补进结果大纲,方便一栋楼内逐个查看全部计算过程弹窗。
   补充行 windows 为空(中间详情区被 v-if 保护,不渲染窗口块),仅用于
   让规则出现在大纲并露出"计算过程"按钮;弹窗内容全部来自 viz mock。
   不带该参数时行为完全不变。后端联调完成后可删除本段。
   ─────────────────────────────────────────────────────────────── */
function isAllRulesPreview() {
  try {
    return new URLSearchParams(window.location.search).has("allrules");
  } catch {
    return false;
  }
}

function backfillAllVizRules(data) {
  if (!data) return data;
  const results = data.results || (data.results = []);
  const byCode = new Map(results.map((r) => [r.ruleCode, r]));
  // 大纲(RuleOutlineList)只渲染这几个分组;其余(如"无数据")会被静默隐藏
  const VISIBLE_CATS = ["目标调适", "待核查", "正常", "无节点"];
  let added = 0;
  let promoted = 0;
  VIZ_RULES.forEach((vr) => {
    const rj = vr.windows?.[0]?.resultJSON;
    const existing = byCode.get(vr.code);
    if (existing) {
      // 已有该规则:若 category 不在可见分组(会被隐藏),提升到 viz 示例对应分组
      if (!VISIBLE_CATS.includes(existing.category)) {
        existing.category = rj?.category || "目标调适";
        existing.detailResult = existing.detailResult || rj?.reason || "";
        existing._vizPreview = true;
        promoted += 1;
      }
      return;
    }
    // 后端未返回该规则:合成一条最小行
    results.push({
      ruleCode: vr.code,
      ruleName: vr.name,
      series: vr.code.includes("-S") ? "S" : vr.code[0],
      priority: "中",
      category: rj?.category || "目标调适",
      validCount: 0,
      triggerCount: 0,
      windows: [],
      modelNodes: [],
      detailResult: rj?.reason || "",
      judgmentStandard: "",
      _vizPreview: true,
    });
    added += 1;
  });
  // 演示:给 3 条规则打上新判定类别,便于验证色卡/大纲分组(可删除)
  const DEMO_NEW_CATS = { C03: "配置错误", C05: "数据异常", D02: "虚拟预测愈合" };
  Object.entries(DEMO_NEW_CATS).forEach(([code, cat]) => {
    const r = results.find((x) => x.ruleCode === code);
    if (r) { r.category = cat; r._vizPreview = true; }
  });
  console.info(`[allrules] 演示:新增 ${added} 条 / 提升 ${promoted} 条隐藏规则(结果共 ${results.length} 条)`);
  return data;
}

/** 获取单栋建筑详细诊断判定与窗口明细结果 */
export async function fetchBuildingById(buildId, year = 2025, opts = {}) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingDetail`, { buildId, year });
    if (data) {
      // 1. 包装 metrics 含义到每个窗口中
      if (data.results) {
        data.results.forEach((r) => {
          if (r.windows) {
            r.windows.forEach((w) => {
              w.values = formatWindowValues(r.ruleCode, w);
            });
          }
        });
      }

      // 2. 对接数据库真实节点的 available 匹配（从所有规则下的 modelNodes 中合并出大楼全部拥有的物理节点）
      const allRuleNodes = [];
      const seenIds = new Set();
      if (data.results) {
        data.results.forEach((r) => {
          if (r.modelNodes) {
            r.modelNodes.forEach((mn) => {
              if (!seenIds.has(mn.modelNodeId)) {
                seenIds.add(mn.modelNodeId);
                allRuleNodes.push(mn);
              }
            });
          }
        });
      }

      data.nodes = ALL_NODES.map((n) => {
        const fullNodeId = `${buildId}X00${n.code}`;
        const found = allRuleNodes.find(mn => mn.modelNodeId === fullNodeId);
        return {
          ...n,
          available: !!found,
          parentNodeId: found ? found.parentNodeId : "—",
          parentNodeName: found ? found.parentNodeName : "—",
          modelNodeName: found ? found.modelNodeName : n.name
        };
      });

      // 3. 关联真实大楼基本数据
      if (data.building) {
        data.building.area = data.totalArea ? parseFloat(data.totalArea).toLocaleString() : "—";
        data.building.floors = data.upFloor ? `地上 ${data.upFloor} · 地下 ${data.downFloor || 0}` : "—";
        data.building.year = data.buildYear ? data.buildYear.toString() : "—";
        data.building.owner = data.buildOwner || "未登记";
      }

      // 【演示辅助】?allrules=1 时补齐全部 viz 规则(见上方说明)
      if (opts.allRules || isAllRulesPreview()) backfillAllVizRules(data);

      return data;
    }
  } catch (error) {
    console.error("fetchBuildingById failed:", error);
  }
  return null;
}

export const ALL_NODES = [
  { code: "U2A00", name: "制冷主机", category: "冷水系统" },
  { code: "U2A01", name: "冷冻泵", category: "冷水系统" },
  { code: "U2A02", name: "冷却水泵", category: "冷水系统" },
  { code: "U2A04", name: "冷却塔", category: "冷水系统" },
  { code: "U2A05", name: "采暖辅助", category: "采暖" },
  { code: "U2B01", name: "AHU 总", category: "AHU" },
  { code: "U2B02", name: "新风机", category: "AHU" },
  { code: "U2000", name: "总电表", category: "计量" },
];

export const RULE_VALUE_MEANING = {
  "C01": [
    { key: "V1", name: "数据1", unit: "%", triggeredWhen: "gte", threshold: "15", desc: "两簇中心距离占均值比" },
    { key: "V2", name: "数据2", unit: "", triggeredWhen: "gte", threshold: "0.5", desc: "聚类清晰度评分" },
    { key: "V3", name: "数据3", unit: "kW", desc: "低工况平均电耗" },
    { key: "V4", name: "数据4", unit: "kW", desc: "高工况平均电耗" },
    { key: "V5", name: "数据5", unit: "kW", desc: "两簇中心距离" },
  ],
  "C02": [
    { key: "V1", name: "湿球降幅", unit: "℃", desc: "窗口内湿球下降值" },
    { key: "V2", name: "电耗变化率", unit: "%", triggeredWhen: "gte", threshold: "-5", desc: "应为负值,持平或上涨触发" },
    { key: "V3", name: "日均干球", unit: "℃", desc: "窗口气象背景" },
  ],
  "C03": [
    { key: "V1", name: "主机涨幅", unit: "%", desc: "主机日电耗增幅" },
    { key: "V2", name: "冷冻泵涨幅", unit: "%", triggeredWhen: "lte", threshold: "1/3 主机", desc: "低于主机涨幅 1/3 触发" },
    { key: "V3", name: "涨幅比", unit: "", desc: "冷冻泵/主机" },
  ],
  "C04": [
    { key: "V1", name: "变异系数 CV", unit: "", triggeredWhen: "lte", threshold: "0.15", desc: "标准差/均值" },
    { key: "V2", name: "max/mean 比", unit: "", triggeredWhen: "lte", threshold: "1.20", desc: "最大值与均值比" },
    { key: "V3", name: "工频占比", unit: "%", desc: "40-45 kW 区间小时占比" },
    { key: "V4", name: "关机占比", unit: "%", desc: "0 kW 小时占比" },
  ],
  "C05": [
    { key: "V1", name: "冷却侧占比", unit: "%", triggeredWhen: "gte", threshold: "40", desc: "占冷水总电耗比" },
    { key: "V2", name: "平均干球", unit: "℃", desc: "窗口高温背景" },
    { key: "V3", name: "平均湿度", unit: "%", desc: "窗口高湿背景" },
  ],
  "C06": [
    { key: "V1", name: "max/min 比", unit: "", triggeredWhen: "gte", threshold: "1.30", desc: "AHU 电耗离散度" },
    { key: "V2", name: "变异系数 CV", unit: "", triggeredWhen: "gte", threshold: "0.20", desc: "标准差/均值" },
    { key: "V3", name: "参与 AHU 数", unit: "", desc: "参与计算的 AHU 台数" },
  ],
  "C07": [
    { key: "V1", name: "室外升温", unit: "℃", desc: "窗口气温上升值" },
    { key: "V2", name: "采暖泵降幅", unit: "%", triggeredWhen: "lte", threshold: "15", desc: "降幅低于 15% 触发" },
  ],
  "C08": [
    { key: "V1", name: "两日温差", unit: "℃", desc: "极寒日 vs 温和日" },
    { key: "V2", name: "电耗差异", unit: "%", triggeredWhen: "lte", threshold: "20", desc: "差异<20% 触发" },
  ],
  "D01": [
    { key: "V1", name: "R² 决定系数", unit: "", triggeredWhen: "lte", threshold: "业态差异", desc: "低于业态阈值触发" },
    { key: "V2", name: "拟合斜率", unit: "kW/℃", desc: "每升 1℃ 的电耗涨幅" },
    { key: "V3", name: "拟合截距", unit: "kW", desc: "基线电耗" },
    { key: "V4", name: "样本数", unit: "", desc: "有效数据点" },
  ],
  "D02": [
    { key: "V1", name: "湿球降幅", unit: "℃", desc: "窗口累计下降值" },
    { key: "V2", name: "冷却降幅", unit: "%", triggeredWhen: "lte", threshold: "业态差异", desc: "低于阈值触发" },
    { key: "V3", name: "首日电耗", unit: "kWh", desc: "" },
    { key: "V4", name: "末日电耗", unit: "kWh", desc: "" },
  ],
  "D03": [
    { key: "V1", name: "夜间中位", unit: "kW", desc: "22:00-06:00 电耗中位" },
    { key: "V2", name: "白天中位", unit: "kW", desc: "09:00-17:00 电耗中位" },
    { key: "V3", name: "夜/日比", unit: "%", triggeredWhen: "gte", threshold: "业态差异", desc: "高于阈值触发" },
    { key: "V4", name: "昼夜温差", unit: "℃", desc: "应 ≤ 1℃" },
  ],
  "D04": [
    { key: "V1", name: "过渡季中位", unit: "kW", desc: "过渡季日电耗中位" },
    { key: "V2", name: "盛夏峰值", unit: "kW", desc: "盛夏日电耗峰值" },
    { key: "V3", name: "过渡/盛夏比", unit: "%", triggeredWhen: "gte", threshold: "业态差异", desc: "高于阈值触发" },
  ],
  "D05": [
    { key: "V1", name: "工作日中位", unit: "kW/日", desc: "" },
    { key: "V2", name: "节假日中位", unit: "kW/日", desc: "" },
    { key: "V3", name: "分组策略", unit: "", desc: "业态分组下的判定方向" },
    { key: "V4", name: "实际差异", unit: "%", desc: "节假日相对工作日的差异" },
  ],
};

export function formatWindowValues(ruleCode, w) {
  const meaning = RULE_VALUE_MEANING[ruleCode] || [];
  return meaning.map((m, i) => {
    const valKey = `value${i + 1}`;
    const rawVal = w[valKey];
    let isTrig = false;
    let formattedVal = "—";

    if (rawVal !== null && rawVal !== undefined) {
      const numVal = parseFloat(rawVal);
      if (m.unit === "%") {
        const absVal = Math.abs(numVal);
        if (absVal > 0 && absVal <= 1) {
          formattedVal = (numVal * 100).toFixed(1);
        } else {
          formattedVal = numVal.toFixed(1);
        }
      } else {
        formattedVal = numVal.toFixed(numVal % 1 === 0 ? 0 : 2);
      }

      if (m.triggeredWhen === "gte" && m.threshold !== "业态差异") {
        isTrig = numVal >= parseFloat(m.threshold);
      } else if (m.triggeredWhen === "lte" && m.threshold !== "业态差异") {
        isTrig = numVal <= parseFloat(m.threshold);
      } else if (m.threshold === "业态差异" || w.isTriggered) {
        isTrig = w.isTriggered;
      }
    }

    return {
      key: m.key,
      name: m.name,
      unit: m.unit,
      desc: m.desc,
      value: formattedVal,
      triggered: isTrig
    };
  });
}
