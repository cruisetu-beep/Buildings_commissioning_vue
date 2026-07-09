<script setup>
/* ═══════════════════════════════════════════════════════════════
   ToggleSwitch · 启用开关
   S 系整体锁定,鼠标悬停显示提示。
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  disabled: { type: Boolean, default: false },
  disabledReason: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const onClick = (e) => {
  if (props.disabled) e.preventDefault();
};
const onChange = (e) => {
  if (!props.disabled) emit("update:modelValue", e.target.checked);
};
</script>

<template>
  <label
    class="toggle"
    :class="{ on: modelValue, disabled }"
    :title="disabled ? disabledReason : ''"
    @click="onClick"
  >
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="onChange" />
    <span class="toggle-track"><span class="toggle-thumb" /></span>
    <Icon v-if="disabled" name="lock" :size="10" stroke="#94a3b8" />
  </label>
</template>
