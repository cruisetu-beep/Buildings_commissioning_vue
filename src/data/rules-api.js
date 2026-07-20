/* ═══════════════════════════════════════════════════════════════
   rules-api.js · 判定规则模块数据访问层
   ───────────────────────────────────────────────────────────────
   数据已全面对接后端接口（/api/CxRule），已移除 RULES_DATA 本地 Mock 数据。
   ═══════════════════════════════════════════════════════════════ */
import { ref } from "vue";
import { FUNC_MAP } from "./func-map.js";
import { RULE_MANUAL, DEFAULT_MANUAL, getManual } from "./rule-manual.js";
import { THRESHOLD_MAP } from "./threshold-map.js";

const API_PREFIX = '/api/CxRule';

// 辅助方法：发送 GET 请求
async function httpGet(url, params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      query.append(key, params[key]);
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${url}${queryString}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

// 辅助方法：发送 POST 请求
async function httpPost(url, data = {}, params = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      query.append(key, params[key]);
    }
  });
  const queryString = query.toString() ? `?${query.toString()}` : '';

  const response = await fetch(`${url}${queryString}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

/** 获取全部判定规则列表 */
export async function fetchRules(params = {}) {
  try {
    const list = await httpGet(`${API_PREFIX}/getRuleList`, params);
    return list || [];
  } catch (error) {
    console.error("fetchRules failed, fallback to empty list:", error);
    return [];
  }
}

/** 获取单条规则详情 */
export async function fetchRuleDetail(cxRuleId) {
  try {
    return await httpGet(`${API_PREFIX}/getRuleDetail`, { ruleId: cxRuleId });
  } catch (error) {
    console.error("fetchRuleDetail failed:", error);
    return null;
  }
}

/** 更新单条规则 */
export async function updateRule(cxRuleId, patch) {
  try {
    // 如果 patch 中只包含 isEnabled，直接调用后端的 toggleRuleStatus 状态切换接口
    const keys = Object.keys(patch);
    if (keys.length === 1 && keys[0] === 'isEnabled') {
      const success = await httpPost(`${API_PREFIX}/toggleRuleStatus`, {}, { ruleId: cxRuleId });
      return success ? { cxRuleId, ...patch } : null;
    }

    // 直接提交完整数据，无需再查一次详情（调用方已持有完整数据）
    const data = { cxRuleId, ...patch };
    const success = await httpPost(`${API_PREFIX}/updateRule`, data);
    return success ? data : null;
  } catch (error) {
    console.error("updateRule failed:", error);
    throw error;
  }
}

/** 新建单条规则 */
export async function createRule(data) {
  try {
    const success = await httpPost(`${API_PREFIX}/createRule`, data);
    return success ? data : null;
  } catch (error) {
    console.error("createRule failed:", error);
    throw error;
  }
}

/** 业态代码 → 业态名称 映射 */
export function fetchFuncMap() {
  return Promise.resolve({ ...FUNC_MAP });
}

/** 规则手册原文(按规则分类编码取,取不到则返回默认模板) */
export function fetchRuleManual(rule) {
  return Promise.resolve(getManual(rule));
}

/** 获取所有业态的差异化阈值矩阵列表 */
export async function fetchThresholdList() {
  try {
    return await httpGet(`${API_PREFIX}/getThresholdList`);
  } catch (error) {
    console.error("fetchThresholdList failed, fallback to empty:", error);
    return [];
  }
}

/** 批量更新所有业态的差异化阈值矩阵列表 */
export async function updateThresholdList(list) {
  try {
    return await httpPost(`${API_PREFIX}/updateThresholdList`, list);
  } catch (error) {
    console.error("updateThresholdList failed:", error);
    throw error;
  }
}

/** D 系规则的业态差异化阈值预览数据（改由后端动态拉取） */
export async function fetchThresholdMap() {
  const list = await fetchThresholdList();
  if (!list || list.length === 0) {
    return THRESHOLD_MAP;
  }
  const map = {
    "D01": {
      unit: "R² ≥",
      values: {},
      notes: { BC: "24h连续", BE: "24h连续" }
    },
    "D02": {
      unit: "降幅 ≥",
      values: {},
      notes: {}
    },
    "D03": {
      unit: "夜/日 ≤",
      values: {},
      notes: { BC: "高", BE: "高" }
    },
    "D04": {
      unit: "过渡/盛夏 ≤",
      values: {},
      notes: { BB: "客流高", BE: "高" }
    },
    "D05": {
      unit: "分组策略",
      values: {},
      notes: {}
    }
  };

  list.forEach(item => {
    const f = item.buildFunc;
    if (!f) return;
    map["D01"].values[f] = item.r2Threshold !== null && item.r2Threshold !== undefined 
      ? item.r2Threshold.toFixed(2) 
      : "";
    map["D02"].values[f] = item.coolingMinDrop !== null && item.coolingMinDrop !== undefined 
      ? `${Math.round(item.coolingMinDrop * 100)}%` 
      : "";
    map["D03"].values[f] = item.nightMaxRatio !== null && item.nightMaxRatio !== undefined 
      ? `${Math.round(item.nightMaxRatio * 100)}%` 
      : "";
    map["D04"].values[f] = item.transMaxRatio !== null && item.transMaxRatio !== undefined 
      ? `${Math.round(item.transMaxRatio * 100)}%` 
      : "";
    map["D05"].values[f] = item.holidayDropGroup || "";
  });

  return map;
}

export const ruleNameMapRef = ref({});
export const ruleMetaMapRef = ref({});

let initPromise = null;

export function initRuleMetaMap() {
  if (initPromise) return initPromise;
  initPromise = fetchRules().then(rules => {
    const nameMap = {};
    const metaMap = {};
    rules.forEach(r => {
      nameMap[r.ruleCode] = r.name;
      metaMap[r.ruleCode] = {
        name: r.name,
        series: r.ruleCode.startsWith('C') ? 'C' : r.ruleCode.startsWith('D') ? 'D' : 'S',
        priority: r.priority,
        brief: r.judgmentStandard || r.thresholdValue
      };
    });
    ruleNameMapRef.value = nameMap;
    ruleMetaMapRef.value = metaMap;
    return metaMap;
  });
  return initPromise;
}

// 同步版本支持详情页初始值（从本地获取兜底映射）
export { RULE_MANUAL, DEFAULT_MANUAL, getManual, THRESHOLD_MAP, FUNC_MAP };
