<script setup>
/* ═══════════════════════════════════════════════════════════════
   MetricsPanel · 关键指标面板
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  metrics: { type: Array, required: true },
});
</script>

<template>
  <div class="metrics-panel card">
    <div class="mp-title">
      <Icon name="sliders" :size="13" stroke="var(--brand)" />
      <span>关键指标</span>
    </div>
    <div class="mp-list">
      <div v-for="(m, i) in metrics" :key="i" class="mp-item" :class="{ trig: m.triggered }">
        <div class="mp-item-head">
          <span class="mp-label">{{ m.label }}</span>
          <span v-if="m.threshold" class="mp-verdict" :class="{ trig: m.triggered }">
            {{ m.triggered ? "越限" : "达标" }}
          </span>
        </div>
        <div class="mp-value-row">
          <span class="mp-value mono" :class="{ trig: m.triggered }">{{ m.value }}</span>
          <span v-if="m.unit" class="mp-unit">{{ m.unit }}</span>
        </div>
        <div v-if="m.threshold" class="mp-threshold mono">阈值 {{ m.threshold }}</div>
        <div v-if="m.info" class="mp-info">{{ m.info }}</div>
      </div>
    </div>
  </div>
</template>
