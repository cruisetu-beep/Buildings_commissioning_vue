import { createRouter, createWebHistory } from "vue-router";
import { MODULES } from "../constants/modules.js";

const routes = [
  { path: "/", redirect: "/rules" },
  { path: "/rules", name: "rules-list", component: () => import("../views/rules/RulesListPage.vue") },
  { path: "/rules/new", name: "rules-create", component: () => import("../views/rules/RuleCreatePage.vue") },
  { path: "/rules/:id", name: "rules-detail", component: () => import("../views/rules/RuleDetailPage.vue") },

  { path: "/params", name: "params", component: () => import("../views/params/ThresholdMatrixPage.vue") },

  { path: "/result", name: "result-list", component: () => import("../views/result/BuildingListPage.vue") },
  { path: "/result/:id", name: "result-detail", component: () => import("../views/result/BuildingDetailPage.vue") },

  // 其余模块:本批次仅占位,后续批次逐个替换
  ...MODULES.filter((m) => m.key !== "rules" && m.key !== "params" && m.key !== "result").map((m) => ({
    path: `/${m.key}`,
    name: m.key,
    component: () => import("../views/PlaceholderPage.vue"),
  })),

  { path: "/:pathMatch(.*)*", redirect: "/rules" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
