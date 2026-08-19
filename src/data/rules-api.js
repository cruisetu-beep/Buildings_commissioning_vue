/* ═══════════════════════════════════════════════════════════════
   rules-api.js · 判定规则模块数据访问层
   ───────────────────────────────────────────────────────────────
   数据已全面对接后端接口（/api/CxRule），已移除 RULES_DATA 本地 Mock 数据。
   ═══════════════════════════════════════════════════════════════ */
import { ref } from "vue";
import { fetchFuncDict } from "./buildings-api.js";
import { fetchThresholds } from "./threshold-matrix-api.js";

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

let cachedRules = null;
let rulesPromise = null;

/** 获取全部判定规则列表（已做全局防并发与 Promise 单例缓存优化） */
export async function fetchRules(params = {}) {
  // 如果带有具体查询参数，不走静态全局缓存
  if (params && Object.keys(params).length > 0) {
    try {
      const list = await httpGet(`${API_PREFIX}/getRuleList`, params);
      return list || [];
    } catch (error) {
      console.error("fetchRules with params failed:", error);
      return [];
    }
  }

  // 1. 如果缓存中已有数据，直接返回
  if (cachedRules) {
    return cachedRules;
  }

  // 2. 如果当前有正在请求中的 Promise，直接复用该 Promise 避免并发请求
  if (rulesPromise) {
    return rulesPromise;
  }

  rulesPromise = (async () => {
    try {
      const list = await httpGet(`${API_PREFIX}/getRuleList`, params);
      cachedRules = list || [];
      return cachedRules;
    } catch (error) {
      console.error("fetchRules failed, fallback to empty list:", error);
      return [];
    } finally {
      // 请求完成后释放单例占位
      rulesPromise = null;
    }
  })();

  return rulesPromise;
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
      if (success) {
        cachedRules = null;
      }
      return success ? { cxRuleId, ...patch } : null;
    }

    // 直接提交完整数据，无需再查一次详情（调用方已持有完整数据）
    const data = { cxRuleId, ...patch };
    const success = await httpPost(`${API_PREFIX}/updateRule`, data);
    if (success) {
      cachedRules = null;
    }
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
    if (success) {
      cachedRules = null;
    }
    return success ? data : null;
  } catch (error) {
    console.error("createRule failed:", error);
    throw error;
  }
}

/** 删除单条规则 */
export async function deleteRule(cxRuleId) {
  try {
    const success = await httpPost(`${API_PREFIX}/deleteRule`, {}, { ruleId: cxRuleId });
    if (success) {
      cachedRules = null;
    }
    return success;
  } catch (error) {
    console.error("deleteRule failed:", error);
    throw error;
  }
}

/** 业态代码 → 业态名称 映射 */
export async function fetchFuncMap() {
  return await fetchFuncDict();
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
  try {
    const thresholds = await fetchThresholds();
    const map = {};
    
    Object.keys(thresholds || {}).forEach(ruleCode => {
      const isPercent = ruleCode === "D02" || ruleCode === "D03" || ruleCode === "D04";
      const isR2 = ruleCode === "D01";
      
      let unit = "";
      if (ruleCode === "D01") unit = "R² ≥";
      else if (ruleCode === "D02") unit = "降幅 ≥";
      else if (ruleCode === "D03") unit = "夜/日 ≤";
      else if (ruleCode === "D04") unit = "过渡/盛夏 ≤";
      else if (ruleCode === "D05") unit = "分组策略";

      let notes = {};
      if (ruleCode === "D01") notes = { BC: "24h连续", BE: "24h连续" };
      else if (ruleCode === "D03") notes = { BC: "高", BE: "高" };
      else if (ruleCode === "D04") notes = { BB: "客流高", BE: "高" };
      
      map[ruleCode] = {
        unit,
        values: {},
        notes
      };
      
      Object.keys(thresholds[ruleCode] || {}).forEach(func => {
        const val = thresholds[ruleCode][func];
        if (val === null || val === undefined) {
          map[ruleCode].values[func] = "";
        } else if (isPercent) {
          map[ruleCode].values[func] = `${Math.round(parseFloat(val) * 100)}%`;
        } else if (isR2) {
          map[ruleCode].values[func] = parseFloat(val).toFixed(2);
        } else {
          map[ruleCode].values[func] = val;
        }
      });
    });
    
    return map;
  } catch (error) {
    console.error("fetchThresholdMap failed:", error);
    return {};
  }
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
        cxRuleId: r.cxRuleId,
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
