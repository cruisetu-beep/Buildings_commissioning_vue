<script setup>
/* ═══════════════════════════════════════════════════════════════
   ArchiveStatusChip · 档案状态徽章
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
});

const CONFIG = {
  "已调适": { c: "#0369a1", bg: "rgba(3,105,161,0.08)", bd: "rgba(3,105,161,0.28)" },
  "待调适": { c: "#d97706", bg: "rgba(217,119,6,0.08)", bd: "rgba(217,119,6,0.28)" },
  "未登记": { c: "#94a3b8", bg: "rgba(148,163,184,0.08)", bd: "rgba(148,163,184,0.25)" },
};

const config = computed(() => CONFIG[props.status]);
</script>

<template>
  <span v-if="config" class="archive-chip" :style="{ color: config.c, background: config.bg, borderColor: config.bd }">
    {{ status }}
  </span>
</template>
