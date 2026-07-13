<script setup>
/* ═══════════════════════════════════════════════════════════════
   CategoryStatusChip · 判定分类徽章
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  category: { type: String, required: true },
});

const CONFIG = {
  "目标调适": { c: "var(--status-target)", bg: "rgba(220,38,38,0.10)", bd: "rgba(220,38,38,0.30)", dotColor: "#dc2626" },
  "待核查": { c: "var(--status-check)", bg: "rgba(14,165,233,0.10)", bd: "rgba(14,165,233,0.30)", dotColor: "#0ea5e9" },
  "正常": { c: "var(--status-normal)", bg: "rgba(24,165,114,0.10)", bd: "rgba(24,165,114,0.30)", dotColor: "#18a572" },
  "无节点": { c: "#94a3b8", bg: "rgba(148,163,184,0.10)", bd: "rgba(148,163,184,0.25)", dotColor: "#94a3b8" },
  "无数据": { c: "#94a3b8", bg: "rgba(203,213,225,0.20)", bd: "rgba(148,163,184,0.20)", dotColor: "#cbd5e1" },
};

const config = computed(() => CONFIG[props.category]);
</script>

<template>
  <span v-if="config" class="cat-chip" :style="{ color: config.c, background: config.bg, borderColor: config.bd }">
    <span class="cat-dot" :style="{ background: config.dotColor }" />
    {{ category }}
  </span>
</template>
