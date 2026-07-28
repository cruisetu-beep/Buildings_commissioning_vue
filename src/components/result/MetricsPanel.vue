<script setup>
/* ═══════════════════════════════════════════════════════════════
   MetricsPanel · 关键指标面板(可选折叠)
   ═══════════════════════════════════════════════════════════════ */
import { ref } from "vue";
import Icon from "../icons/Icon.vue";

const props = defineProps({
  metrics: { type: Array, required: true },
  collapsible: { type: Boolean, default: false },     // 是否可折叠
  defaultCollapsed: { type: Boolean, default: false }, // 默认是否收起
});

const collapsed = ref(props.collapsible && props.defaultCollapsed);
function toggle() {
  if (props.collapsible) collapsed.value = !collapsed.value;
}
</script>

<template>
  <div class="metrics-panel card" :class="{ 'mp-collapsed': collapsible && collapsed }">
    <div class="mp-title" :class="{ 'mp-clickable': collapsible }" @click="toggle">
      <Icon name="sliders" :size="13" stroke="var(--brand)" />
      <span>关键指标</span>
      <template v-if="collapsible">
        <span class="mp-count mono">{{ metrics.length }}</span>
        <Icon :name="collapsed ? 'chevron-r' : 'chevron-d'" :size="12" stroke="var(--text-3)" class="mp-toggle-icon" />
      </template>
    </div>
    <div v-show="!collapsed" class="mp-list">
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
