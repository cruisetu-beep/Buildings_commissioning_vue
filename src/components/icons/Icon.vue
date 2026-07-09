<script setup>
/* ═══════════════════════════════════════════════════════════════
   Icon · 极简 SVG 图标集
   从原型 cx_workbench.html 的 Icon 组件(switch-case)迁移而来,
   图标路径数据集中在 constants/icon-paths.js。
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import { ICON_PATHS } from "../../constants/icon-paths.js";

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
  stroke: { type: String, default: "currentColor" },
});

const inner = computed(() => ICON_PATHS[props.name] || "");
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="stroke"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="inner"
  />
</template>
