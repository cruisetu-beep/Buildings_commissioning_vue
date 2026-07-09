/* ═══════════════════════════════════════════════════════════════
   rules-api.js · 判定规则模块数据访问层
   ───────────────────────────────────────────────────────────────
   当前:直接返回本地 mock 数据(rules-data.js / rule-manual.js / threshold-map.js)。
   未来:数据将通过后端接口获取。届时只需替换本文件内各函数的实现
        (改为 fetch/axios 调用真实接口),上层组件(RulesListPage /
        RuleDetailPage)无需任何改动 —— 它们只依赖这里导出的函数签名。

   建议的未来接口对照:
     fetchRules()          → GET  /api/cx-rules
     updateRule(id, patch) → PATCH /api/cx-rules/:id
     fetchRuleManual(code) → GET  /api/cx-rules/:code/manual
     fetchThresholdMap()   → GET  /api/cx-rule-thresholds
   ═══════════════════════════════════════════════════════════════ */
import { RULES_DATA } from "./rules-data.js";
import { FUNC_MAP } from "./func-map.js";
import { RULE_MANUAL, DEFAULT_MANUAL, getManual } from "./rule-manual.js";
import { THRESHOLD_MAP } from "./threshold-map.js";

// 模拟异步接口延迟(0ms,预留未来替换为真实网络请求时的 await 结构)
const asyncResolve = (value) => Promise.resolve(value);

/** 获取全部判定规则列表 */
export function fetchRules() {
  // 深拷贝避免调用方直接修改到"数据源"
  return asyncResolve(RULES_DATA.map(r => ({ ...r })));
}

/** 更新单条规则(当前仅内存态模拟,未来对接 PATCH 接口) */
export function updateRule(cxRuleId, patch) {
  const idx = RULES_DATA.findIndex(r => r.cxRuleId === cxRuleId);
  if (idx !== -1) RULES_DATA[idx] = { ...RULES_DATA[idx], ...patch };
  return asyncResolve(idx !== -1 ? { ...RULES_DATA[idx] } : null);
}

/** 业态代码 → 业态名称 映射 */
export function fetchFuncMap() {
  return asyncResolve({ ...FUNC_MAP });
}

/** 规则手册原文(按规则分类编码取,取不到则返回默认模板) */
export function fetchRuleManual(rule) {
  return asyncResolve(getManual(rule));
}

/** D 系规则的业态差异化阈值预览数据 */
export function fetchThresholdMap() {
  return asyncResolve({ ...THRESHOLD_MAP });
}

// 同步版本(部分场景如详情页初始表单值需要在渲染前直接取值,保留同步导出)
export { RULE_MANUAL, DEFAULT_MANUAL, getManual, THRESHOLD_MAP, FUNC_MAP, RULES_DATA };
