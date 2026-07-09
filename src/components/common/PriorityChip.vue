<script setup>
/* ═══════════════════════════════════════════════════════════════
   PriorityChip · 优先级徽章
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  priority: { type: String, required: true },
});

const CONFIG = {
  "最高": { color: "var(--prio-highest)", bg: "rgba(185,28,28,0.10)", border: "rgba(185,28,28,0.30)", dot: true },
  "高":   { color: "var(--prio-high)",    bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.30)" },
  "中":   { color: "var(--prio-mid)",     bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.30)" },
  "低":   { color: "var(--prio-low)",     bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.30)" },
  "分组": { color: "var(--prio-group)",   bg: "rgba(122,92,255,0.10)", border: "rgba(122,92,255,0.30)" },
};

const config = computed(() => CONFIG[props.priority] || { color: "var(--text-2)", bg: "var(--bg-2)", border: "var(--line)" });
</script>

<template>
  <span
    class="chip priority"
    :style="{ color: config.color, background: config.bg, borderColor: config.border }"
  >
    <span v-if="config.dot" class="chip-dot" :style="{ background: config.color }" />
    {{ priority }}
  </span>
</template>
