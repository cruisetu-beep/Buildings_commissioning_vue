<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildFuncTag · 业态标签
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  func: { type: String, required: true },
  funcName: { type: String, required: true },
});

const COLORS = {
  AA: { c: "#1e40af", bg: "rgba(30,64,175,0.08)", bd: "rgba(30,64,175,0.25)" },
  BA: { c: "#0369a1", bg: "rgba(3,105,161,0.08)", bd: "rgba(3,105,161,0.25)" },
  BB: { c: "#b45309", bg: "rgba(180,83,9,0.08)", bd: "rgba(180,83,9,0.25)" },
  BC: { c: "#7c3aed", bg: "rgba(124,58,237,0.08)", bd: "rgba(124,58,237,0.25)" },
  BD: { c: "#be185d", bg: "rgba(190,24,93,0.08)", bd: "rgba(190,24,93,0.25)" },
  BE: { c: "#059669", bg: "rgba(5,150,105,0.08)", bd: "rgba(5,150,105,0.25)" },
  BF: { c: "#d97706", bg: "rgba(217,119,6,0.08)", bd: "rgba(217,119,6,0.25)" },
  BH: { c: "#0891b2", bg: "rgba(8,145,178,0.08)", bd: "rgba(8,145,178,0.25)" },
  BI: { c: "#6b21a8", bg: "rgba(107,33,168,0.08)", bd: "rgba(107,33,168,0.25)" },
  BJ: { c: "#4338ca", bg: "rgba(67,56,202,0.08)", bd: "rgba(67,56,202,0.25)" },
  BZ: { c: "#64748b", bg: "rgba(100,116,139,0.08)", bd: "rgba(100,116,139,0.25)" },
  BY: { c: "#94a3b8", bg: "rgba(148,163,184,0.08)", bd: "rgba(148,163,184,0.25)" },
};

const colors = computed(() => COLORS[props.func] || { c: "#64748b", bg: "rgba(100,116,139,0.08)", bd: "rgba(100,116,139,0.25)" });
</script>

<template>
  <span class="func-tag" :style="{ color: colors.c, background: colors.bg, borderColor: colors.bd }">
    <span class="func-code mono">{{ func }}</span>
    <span class="func-name">{{ funcName }}</span>
  </span>
</template>
