<script setup>
/* ═══════════════════════════════════════════════════════════════
   S系提示条(仅在切到 S 系 tab 时显示)
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  count: { type: Number, default: 21 }
});
</script>

<template>
  <div class="s-banner">
    <Icon name="alert" :size="16" stroke="#d97706" />
    <div class="s-banner-text">
      <b>S 系规则当前批次未启用。</b>
      {{ count }} 条业态专属规则的计算逻辑仍在优化中,规则定义仅供查阅,不参与判定计算,启用开关和批量操作已锁定。
    </div>
  </div>
</template>
