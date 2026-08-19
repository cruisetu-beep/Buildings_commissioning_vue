<script setup>
/* ═══════════════════════════════════════════════════════════════
   MatrixCell · 阈值矩阵单元格
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
const props = defineProps({
  rule: { type: String, required: true },
  func: { type: String, required: true },
  funcName: { type: String, required: true },
  value: { type: String, required: true },
  original: { type: String, required: true },
  editable: { type: Boolean, default: false },
  meta: { type: Object, required: true },
  valid: { type: Boolean, required: true },
});
const emit = defineEmits(["change"]);

const isChanged = computed(() => props.value !== props.original);
const cellColor = computed(() => props.meta.color);
const title = computed(() => `${props.rule} · ${props.funcName}`);

const onInputChange = (e) => emit("change", e.target.value);
</script>

<template>
  <div
    class="m-cell"
    :class="{ changed: isChanged, editable, invalid: !valid }"
    :title="title"
  >
    <template v-if="editable">
      <select
        v-if="meta.type === 'select'"
        class="m-cell-select"
        :value="value"
        @change="onInputChange"
      >
        <option v-for="o in meta.options" :key="o" :value="o">{{ o }}</option>
      </select>
      <div v-else class="m-cell-input-wrap">
        <input
          type="number"
          class="m-cell-input mono"
          :value="value"
          :min="meta.min" :max="meta.max" :step="meta.step"
          @input="onInputChange"
        />
        <span v-if="meta.suffix" class="m-cell-suffix">{{ meta.suffix }}</span>
      </div>
    </template>
    <div v-else class="m-cell-view">
      <span class="m-cell-value mono" :style="{ color: isChanged ? 'var(--warn)' : cellColor }">
        {{ value }}{{ meta.suffix }}
      </span>
    </div>

    <!-- 修改标记 -->
    <span v-if="isChanged" class="m-cell-change-mark" :title="`原值:${original}`" />

    <!-- 校验失败标记 -->
    <span v-if="!valid" class="m-cell-invalid" title="超出合法范围">
      <Icon name="alert" :size="9" stroke="var(--danger)" />
    </span>
  </div>
</template>
