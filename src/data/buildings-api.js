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
    return data || [];
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

/** 获取单栋建筑详细诊断判定与窗口明细结果 */
export async function fetchBuildingById(buildId, year = 2025, opts = {}) {
  try {
    const data = await httpGet(`${API_PREFIX}/getBuildingDetail`, { buildId, year });
    if (data) {
      // 对接数据库真实节点的 available 匹配（动态根据大楼全部判定规则需要的节点作为考核点，对比实际匹配的节点）
      const requiredCodes = new Set();
      if (data.results) {
        data.results.forEach((r) => {
          if (r.requiredNodeTypes) {
            r.requiredNodeTypes.split(",").forEach((c) => {
              const code = c.trim();
              if (code) requiredCodes.add(code);
            });
          }
        });
      }

      const testCodes = [...requiredCodes];

      const actualNodesMap = new Map();
      if (data.modelNodes) {
        data.modelNodes.forEach((mn) => {
          const last5 = mn.modelNodeId.substring(mn.modelNodeId.length - 5);
          actualNodesMap.set(last5, mn);
        });
      }

      const nodeNameMap = {
        U2A00: "制冷主机", U2A01: "冷冻泵", U2A02: "冷却水泵", U2A04: "冷却塔",
        U2A05: "采暖辅助", U2B01: "AHU 总", U2B02: "新风机", U2000: "总电表"
      };
      const nodeCatMap = {
        U2A00: "冷水系统", U2A01: "冷水系统", U2A02: "冷水系统", U2A04: "冷水系统",
        U2A05: "采暖", U2B01: "AHU", U2B02: "AHU", U2000: "计量"
      };

      data.nodes = testCodes.map((code) => {
        const found = actualNodesMap.get(code);
        return {
          code,
          name: nodeNameMap[code] || found?.modelNodeName || "未知节点",
          category: nodeCatMap[code] || "计量",
          available: !!found,
          parentNodeId: found ? found.parentNodeId : "—",
          parentNodeName: found ? found.parentNodeName : "—",
          modelNodeName: found ? found.modelNodeName : (nodeNameMap[code] || "未知节点")
        };
      });

      if (data.building) {
        data.building.area = data.totalArea ? parseFloat(data.totalArea).toLocaleString() : "—";
        data.building.floors = data.upFloor ? `地上 ${data.upFloor} · 地下 ${data.downFloor || 0}` : "—";
        data.building.year = data.buildYear ? data.buildYear.toString() : "—";
        data.building.owner = data.buildOwner || "未登记";
      }

      return data;
    }
  } catch (error) {
    console.error("fetchBuildingById failed:", error);
  }
  return null;
}

