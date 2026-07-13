/* ═══════════════════════════════════════════════════════════════
   buildings-api.js · 判定结果模块(建筑清单)数据访问层
   ───────────────────────────────────────────────────────────────
   接口约定与 rules-api.js / threshold-matrix-api.js 保持一致
   (httpGet + /api/ 前缀 + 请求超时)。后端尚未提供本模块接口时,
   自动降级为本地 mock 数据(buildings-data.js),页面仍可正常使用。
   ═══════════════════════════════════════════════════════════════ */
import { BUILDINGS_DATA } from "./buildings-data.js";

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

/** 获取建筑清单(按分析年份)。接口未就绪时降级为本地 mock 数据。 */
export async function fetchBuildings(params = {}) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingList`, params);
    return data || BUILDINGS_DATA.map((b) => ({ ...b }));
  } catch (error) {
    console.warn("fetchBuildings failed, fallback to local mock data:", error);
    return BUILDINGS_DATA.map((b) => ({ ...b }));
  }
}

/** 获取单栋建筑基础信息(用于详情页直接进入 /result/:id 时,清单未加载的兜底) */
export async function fetchBuildingById(buildId) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingDetail`, { buildId });
    if (data) return data;
  } catch (error) {
    console.warn("fetchBuildingById failed, fallback to local mock data:", error);
  }
  return BUILDINGS_DATA.find((b) => b.buildId === buildId) || null;
}

export { BUILDINGS_DATA };
