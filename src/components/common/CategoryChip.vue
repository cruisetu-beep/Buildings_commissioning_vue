<script setup>
/* ═══════════════════════════════════════════════════════════════
   CategoryChip · 设备类别徽章
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";

const props = defineProps({
  category: { type: String, required: true },
});

const CONFIG = {
  "冷水系统": { color: "var(--cat-water)",   bg: "rgba(14,165,233,0.10)", border: "rgba(14,165,233,0.28)", icon: "thermo" },
  "AHU":     { color: "var(--cat-ahu)",     bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", icon: "wind" },
  "冷却塔":   { color: "var(--cat-tower)",   bg: "rgba(6,182,212,0.10)",  border: "rgba(6,182,212,0.28)",  icon: "layers" },
  "采暖":    { color: "var(--cat-heat)",    bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.28)", icon: "thermo" },
  "通用":    { color: "var(--cat-general)", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.28)", icon: "list" },
};

const config = computed(() => CONFIG[props.category] || { color: "var(--text-2)", bg: "var(--bg-2)", border: "var(--line)", icon: "list" });
</script>

<template>
  <span
    class="chip category"
    :style="{ color: config.color, background: config.bg, borderColor: config.border }"
  >
    <Icon :name="config.icon" :size="11" />
    {{ category }}
  </span>
</template>
