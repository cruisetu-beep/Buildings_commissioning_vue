<script setup>
/* ═══════════════════════════════════════════════════════════════
   SeriesTag · 规则系列标签(C / D / S)
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  series: { type: String, required: true },
});

const CONFIG = {
  C: { label: "C系", color: "var(--series-c)", bg: "rgba(47,127,255,0.10)", border: "rgba(47,127,255,0.30)" },
  D: { label: "D系", color: "var(--series-d)", bg: "rgba(122,92,255,0.10)", border: "rgba(122,92,255,0.30)" },
  S: { label: "S系", color: "var(--series-s)", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)" },
};

const config = computed(() => CONFIG[props.series]);
</script>

<template>
  <span
    class="chip series mono"
    :style="{ color: config.color, background: config.bg, borderColor: config.border }"
  >
    {{ config.label }}
  </span>
</template>
