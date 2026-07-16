<script setup>
/* ═══════════════════════════════════════════════════════════════
   WindowInfoPanel · 窗口气象与样本信息
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  info: { type: Object, required: true }, // { [label]: value }
});
</script>

<template>
  <div class="window-info-panel card">
    <div class="mp-title">
      <Icon name="target" :size="13" stroke="var(--brand)" />
      <span>窗口信息</span>
    </div>
    <dl class="wi-list">
      <template v-for="(v, k) in info" :key="k">
        <dt>{{ k }}</dt>
        <dd class="mono">{{ v }}</dd>
      </template>
    </dl>
  </div>
</template>
