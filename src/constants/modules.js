/* ═══════════════════════════════════════════════════════════════
   modules.js · 顶部导航 7 大模块定义
   与原型 cx_workbench.html 中的 MODULES 常量保持一致。
   key 对应路由的第一段路径(/:key)。
   ═══════════════════════════════════════════════════════════════ */
export const MODULES = [
  { key: "rules",   label: "判定规则", icon: "rules",     active: true },
  { key: "params",  label: "参数配置", icon: "sliders",   active: true },
  { key: "compute", label: "判定计算", icon: "play",      active: true },
  { key: "result",  label: "判定结果", icon: "target",    active: true },
  { key: "building-batch-sort", label: "待调试楼宇判断", icon: "building", active: true },
  { key: "process", label: "计算过程", icon: "flask",     active: true },
  { key: "advice",  label: "调适建议", icon: "lightbulb", active: true },
  { key: "history", label: "运行历史", icon: "history",   active: false },
];
