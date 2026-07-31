/* ═══════════════════════════════════════════════════════════════
   buildingSort.js · 待调试楼宇批次判断 API 与数据服务
   1. 发送 HTTP 请求调用本地后端接口 (通过 /api 代理到 https://127.0.0.1:7023)
   2. 内置 Mock 回退机制，保障在后端接口准备中时可以顺畅体验与测试 UI
   3. 核心排序依据：
      - hitRules: 命中待调试规则数 (降序：规则多优先)
      - eliminatedDevices: 楼宇淘汰设备数 (降序：设备多优先)
      - carbonScore: 楼宇碳效码评分 (升序：得分低/碳效差优先)
   ═══════════════════════════════════════════════════════════════ */

// 模拟建筑调适基础数据集
const MOCK_BUILDINGS_DATA = [
  {
    buildId: "HP-BLD-001",
    buildName: "黄浦区行政服务中心",
    buildFunc: "AA",
    buildFuncName: "机关办公",
    hitRulesCount: 6,
    eliminatedDevicesCount: 14,
    carbonScore: 48,
    carbonCode: "E",
    judgmentCriteria: "命中6条待调试高耗能规则；包含14台强制/限期淘汰电动机及冷水机组；碳效评分48分(E级)需优先调适。",
    lastEvaluationDate: "2026-07-28"
  },
  {
    buildId: "HP-BLD-002",
    buildName: "南京东路商务中心 A座",
    buildFunc: "BA",
    buildFuncName: "商业办公",
    hitRulesCount: 8,
    eliminatedDevicesCount: 9,
    carbonScore: 55,
    carbonCode: "D",
    judgmentCriteria: "命中8条冷站与通风待调试规则；包含9台低效老旧泵组；碳效评分55分(D级)。",
    lastEvaluationDate: "2026-07-29"
  },
  {
    buildId: "HP-BLD-003",
    buildName: "外滩金融创新大楼",
    buildFunc: "BA",
    buildFuncName: "商业办公",
    hitRulesCount: 5,
    eliminatedDevicesCount: 18,
    carbonScore: 62,
    carbonCode: "C",
    judgmentCriteria: "包含18台低效淘汰风机水泵设备；命中5条供暖季控制规则；碳效评分62分(C级)。",
    lastEvaluationDate: "2026-07-25"
  },
  {
    buildId: "HP-BLD-004",
    buildName: "淮海中路时尚广场",
    buildFunc: "BB",
    buildFuncName: "商场",
    hitRulesCount: 8,
    eliminatedDevicesCount: 12,
    carbonScore: 42,
    carbonCode: "E",
    judgmentCriteria: "碳效得分42分极低；命中8条调适规则；拥有12台淘汰级变频器与风机。",
    lastEvaluationDate: "2026-07-30"
  },
  {
    buildId: "HP-BLD-005",
    buildName: "人民广场地铁大厦",
    buildFunc: "BJ",
    buildFuncName: "交通枢纽",
    hitRulesCount: 4,
    eliminatedDevicesCount: 7,
    carbonScore: 50,
    carbonCode: "D",
    judgmentCriteria: "命中4条调适规则；7台淘汰设备；碳效得分50分(D级)。",
    lastEvaluationDate: "2026-07-20"
  },
  {
    buildId: "HP-BLD-006",
    buildName: "新天地时尚购物中心",
    buildFunc: "BB",
    buildFuncName: "商场",
    hitRulesCount: 7,
    eliminatedDevicesCount: 15,
    carbonScore: 58,
    carbonCode: "D",
    judgmentCriteria: "命中7条调适规则；拥有15台淘汰设备；碳效得分58分(D级)。",
    lastEvaluationDate: "2026-07-22"
  },
  {
    buildId: "HP-BLD-007",
    buildName: "黄浦江畔文化艺术中心",
    buildFunc: "BD",
    buildFuncName: "文化场馆",
    hitRulesCount: 3,
    eliminatedDevicesCount: 5,
    carbonScore: 71,
    carbonCode: "B",
    judgmentCriteria: "命中3条调适规则；5台淘汰设备；碳效评分71分(B级)。",
    lastEvaluationDate: "2026-07-15"
  },
  {
    buildId: "HP-BLD-008",
    buildName: "思南路生态科技大楼",
    buildFunc: "BA",
    buildFuncName: "商业办公",
    hitRulesCount: 6,
    eliminatedDevicesCount: 11,
    carbonScore: 51,
    carbonCode: "D",
    judgmentCriteria: "命中6条调适规则；11台淘汰设备；碳效评分51分(D级)。",
    lastEvaluationDate: "2026-07-27"
  },
  {
    buildId: "HP-BLD-009",
    buildName: "打浦桥综合服务大厦",
    buildFunc: "AA",
    buildFuncName: "机关办公",
    hitRulesCount: 5,
    eliminatedDevicesCount: 8,
    carbonScore: 65,
    carbonCode: "C",
    judgmentCriteria: "命中5条调适规则；8台淘汰设备；碳效评分65分(C级)。",
    lastEvaluationDate: "2026-07-18"
  },
  {
    buildId: "HP-BLD-010",
    buildName: "豫园商圈智慧物流大厦",
    buildFunc: "BZ",
    buildFuncName: "其他",
    hitRulesCount: 9,
    eliminatedDevicesCount: 16,
    carbonScore: 39,
    carbonCode: "E",
    judgmentCriteria: "命中高达9条调适规则；淘汰设备数16台；碳效得分仅39分(E级)，建议紧急处置。",
    lastEvaluationDate: "2026-07-31"
  }
];

/**
 * 模拟多级动态排序函数
 * @param {Array} list 待排序楼宇列表
 * @param {Array} priorityKeys 规则优先级列表，如 ['hitRules', 'eliminatedDevices', 'carbonScore']
 */
function sortBuildingsByPriority(list, priorityKeys) {
  return list.sort((a, b) => {
    for (const key of priorityKeys) {
      if (key === 'hitRules') {
        // 1. 命中待调试规则数量（降序：多 -> 少）
        if (a.hitRulesCount !== b.hitRulesCount) {
          return b.hitRulesCount - a.hitRulesCount;
        }
      } else if (key === 'eliminatedDevices') {
        // 2. 楼宇淘汰设备数量（降序：多 -> 少）
        if (a.eliminatedDevicesCount !== b.eliminatedDevicesCount) {
          return b.eliminatedDevicesCount - a.eliminatedDevicesCount;
        }
      } else if (key === 'carbonScore') {
        // 3. 楼宇碳效码评分（升序：低分/等级差优先 -> 高分）
        if (a.carbonScore !== b.carbonScore) {
          return a.carbonScore - b.carbonScore;
        }
      }
    }
    return 0;
  });
}

/**
 * 获取待调试楼宇批次判断与推荐列表
 * @param {Object} params { buildFunc, limitCount, sortPriority }
 */
export async function getBuildingCommissioningSort(params = {}) {
  const limitCount = params.limitCount || 10;
  const buildFunc = params.buildFunc || "";
  const sortPriority = params.sortPriority || ["hitRules", "eliminatedDevices", "carbonScore"];

  // 构造发给后端的 rules 规则结构
  const rules = sortPriority.map(key => (typeof key === "string" ? { ruleKey: key } : key));

  try {
    const response = await fetch("/api/CxRuleResult/getBuildingCommissioningSort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limitCount, buildFunc, rules })
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData && (resData.code === 200 || resData.success || resData.data)) {
        const payloadData = resData.data || resData;
        if (payloadData && payloadData.items) {
          return payloadData;
        }
      }
    }
  } catch (err) {
    console.warn("请求本地后端接口失败，自动切换为 Mock 模拟计算数据:", err.message);
  }

  // ──── Mock 回退数据处理 ────
  let list = JSON.parse(JSON.stringify(MOCK_BUILDINGS_DATA));

  // 1. 业态筛选 (兼容编码与名称)
  if (buildFunc) {
    list = list.filter(b => b.buildFunc === buildFunc || b.buildFuncName.includes(buildFunc));
  }

  // 2. 多级动态加权排序
  const sorted = sortBuildingsByPriority(list, sortPriority);

  // 3. 截取 Top N 并生成推荐排名
  const rawTotalCount = sorted.length;
  const items = sorted.slice(0, limitCount).map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  return {
    limitCount,
    totalCount: rawTotalCount,
    items
  };
}

/**
 * 获取建筑业态下拉选项（与双碳黄浦全系统标准字典对齐）
 */
export async function getBuildingFuncOptions() {
  return [
    { label: "全部业态", value: "" },
    { label: "机关办公 (AA)", value: "AA" },
    { label: "商业办公 (BA)", value: "BA" },
    { label: "商场 (BB)", value: "BB" },
    { label: "酒店 (BC)", value: "BC" },
    { label: "文化场馆 (BD)", value: "BD" },
    { label: "医疗 (BE)", value: "BE" },
    { label: "体育 (BF)", value: "BF" },
    { label: "教育 (BH)", value: "BH" },
    { label: "会展 (BI)", value: "BI" },
    { label: "交通枢纽 (BJ)", value: "BJ" },
    { label: "居民住宅 (BY)", value: "BY" },
    { label: "其他 (BZ)", value: "BZ" }
  ];
}

