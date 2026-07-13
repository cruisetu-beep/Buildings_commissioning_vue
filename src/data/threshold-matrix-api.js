/* ═══════════════════════════════════════════════════════════════
   threshold-matrix-api.js · 业态阈值矩阵(2.1)数据访问层
   ───────────────────────────────────────────────────────────────
   接口约定与 rules-api.js 保持一致(httpGet/httpPost + /api/ 前缀)。
   后端尚未提供本模块接口时,自动降级为本地默认阈值(DEFAULT_THRESHOLDS),
   页面仍可正常使用;接口就绪后无需改动页面组件,仅需确认下方
   API_PREFIX 与实际路由一致即可。
   ═══════════════════════════════════════════════════════════════ */
import { DEFAULT_THRESHOLDS } from "./threshold-matrix-data.js";

const API_PREFIX = "/api/CxRuleFuncThreshold";

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

async function httpPost(url, data = {}, params = {}) {
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
    const response = await fetch(`${url}${queryString}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  } finally {
    clearTimeout(timer);
  }
}

/** 获取当前生效的阈值矩阵(rule → func → value)。接口未就绪时降级为出厂默认值。 */
export async function fetchThresholds() {
  try {
    const data = await httpGet(`${API_PREFIX}/getThresholds`);
    return data || JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  } catch (error) {
    console.warn("fetchThresholds failed, fallback to DEFAULT_THRESHOLDS:", error);
    return JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  }
}

/** 批量保存阈值变更。changes: [{ rule, func, oldValue, newValue }] */
export async function saveThresholds(changes) {
  try {
    const success = await httpPost(`${API_PREFIX}/updateThresholds`, { changes });
    return !!success;
  } catch (error) {
    console.error("saveThresholds failed:", error);
    throw error;
  }
}

/** 恢复出厂默认阈值(服务端持久化)。接口未就绪时仅在前端本地恢复。 */
export async function resetThresholdsToDefault() {
  try {
    const success = await httpPost(`${API_PREFIX}/resetDefault`);
    return success ? JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)) : null;
  } catch (error) {
    console.warn("resetThresholdsToDefault failed, fallback to local reset:", error);
    return JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  }
}

export { DEFAULT_THRESHOLDS };
export { THRESHOLD_RULE_META, AFFECTED_COUNT, FUNC_LIST, RULE_LIST } from "./threshold-matrix-data.js";
