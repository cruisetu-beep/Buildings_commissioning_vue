<script setup>
/* ═══════════════════════════════════════════════════════════════
   SavedBanner · 保存成功提示(方案甲:立即生效)
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  show: { type: Boolean, required: true },
  changedFields: { type: Array, required: true },
});
</script>

<template>
  <div v-if="show" class="saved-banner float-in">
    <Icon name="check" :size="16" stroke="var(--ok)" />
    <div>
      <b>变更已保存并立即生效。</b>
      <div class="saved-sub">
        {{ changedFields.length }} 项字段被修改 · 下次判定计算将采用新值 · 历史判定结果不受影响
      </div>
    </div>
  </div>
</template>
