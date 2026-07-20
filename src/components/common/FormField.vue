<script setup>
/* ═══════════════════════════════════════════════════════════════
   FormField · 统一字段容器
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: "" },
  required: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  fullWidth: { type: Boolean, default: false },
  changed: { type: Boolean, default: false },
  error: { type: String, default: "" },
});
</script>

<template>
  <div class="form-field" :class="{ full: fullWidth, readonly: readOnly, changed, 'has-error': error }">
    <div class="form-field-head">
      <label class="form-label">
        {{ label }}
        <span v-if="required" class="required-mark">*</span>
        <span v-if="readOnly" class="readonly-tag">
          <Icon name="lock" :size="9" stroke="currentColor" /> 只读
        </span>
        <span v-if="changed" class="changed-dot" title="已修改" />
      </label>
      <div v-if="hint" class="form-hint">{{ hint }}</div>
    </div>
    <div class="form-field-body">
      <slot />
      <!-- 表单项错误提示 -->
      <div v-if="error" class="form-field-error-text">
        <Icon name="alert" :size="11" stroke="var(--danger)" />
        <span>{{ error }}</span>
      </div>
    </div>
  </div>
</template>
