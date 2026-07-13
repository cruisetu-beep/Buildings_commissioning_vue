<script setup>
/* ═══════════════════════════════════════════════════════════════
   HitCountBadge · 命中数徽章(分档着色)
   分档:7+ 深红 / 5-6 橙 / 4 黄 / 1-3 灰 / 0 淡灰
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  count: { type: Number, required: true },
  size: { type: String, default: "md" },
});

const tier = computed(() => {
  const c = props.count;
  if (c >= 7) return { color: "var(--hit-7plus)", bg: "rgba(185,28,28,0.10)", border: "rgba(185,28,28,0.35)", label: "极高" };
  if (c >= 5) return { color: "var(--hit-5-6)", bg: "rgba(234,88,12,0.10)", border: "rgba(234,88,12,0.35)", label: "很高" };
  if (c === 4) return { color: "var(--hit-4)", bg: "rgba(202,138,4,0.12)", border: "rgba(202,138,4,0.35)", label: "较高" };
  if (c > 0) return { color: "var(--hit-below)", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.28)", label: "一般" };
  return { color: "var(--text-3)", bg: "var(--bg-2)", border: "var(--line)", label: "—" };
});
</script>

<template>
  <div
    class="hit-badge"
    :class="`sz-${size}`"
    :style="{ color: tier.color, background: tier.bg, borderColor: tier.border }"
    :title="`命中 ${count} 条规则(${tier.label})`"
  >
    <div class="hit-num mono">{{ count }}</div>
    <div class="hit-unit">条</div>
  </div>
</template>
