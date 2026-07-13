<script setup>
/* ═══════════════════════════════════════════════════════════════
   ValueRow · 单个 F_Value 行
   ═══════════════════════════════════════════════════════════════ */
defineProps({
  v: { type: Object, required: true },
});
</script>

<template>
  <div class="val-row" :class="{ trig: v.triggered }">
    <div class="val-row-left">
      <span class="val-key mono">{{ v.key }}</span>
      <span class="val-name">{{ v.name }}</span>
    </div>
    <div class="val-row-mid">
      <span class="val-value mono" :class="{ trig: v.triggered }">{{ v.value }}</span>
      <span v-if="v.unit" class="val-unit">{{ v.unit }}</span>
    </div>
    <div class="val-row-right">
      <span v-if="v.threshold" class="val-threshold mono">
        阈值 {{ v.triggeredWhen === "lte" ? "≥" : v.triggeredWhen === "gte" ? "≤" : "" }}{{ v.threshold }}
      </span>
      <span v-if="v.desc" class="val-desc">{{ v.desc }}</span>
    </div>
    <span v-if="v.triggered" class="val-trig-tag mono">越限</span>
  </div>
</template>
