<script setup>
/* ═══════════════════════════════════════════════════════════════
   ThresholdPreview · D 系规则的业态阈值预览
   ═══════════════════════════════════════════════════════════════ */
import { ref, watch, computed, onMounted } from "vue";
import Icon from "../icons/Icon.vue";
import { fetchThresholdMap, FUNC_MAP } from "../../data/rules-api.js";

const props = defineProps({
  ruleCode: { type: String, required: true },
});
const emit = defineEmits(["jump-to-matrix"]);

const config = ref(null);

const loadThresholdData = async () => {
  if (!props.ruleCode) return;
  const map = await fetchThresholdMap();
  config.value = map[props.ruleCode] || null;
};

onMounted(() => {
  loadThresholdData();
});

watch(() => props.ruleCode, () => {
  loadThresholdData();
});

const entries = computed(() => (config.value ? Object.entries(config.value.values) : []));
</script>

<template>
  <div v-if="config" class="threshold-preview-wrap">
    <div class="threshold-unit-tip">
      <Icon name="info" :size="11" stroke="#6a7da3" />
      <span>指标单位 / 判定方向:<b class="mono">{{ config.unit }}</b></span>
      <button class="section-link" @click="emit('jump-to-matrix')">
        前往阈值矩阵编辑 <Icon name="chevron-r" :size="11" />
      </button>
    </div>
    <div class="threshold-preview-grid">
      <div v-for="[func, value] in entries" :key="func" class="threshold-cell">
        <div class="tc-func">
          <span class="tc-func-code mono">{{ func }}</span>
          <span class="tc-func-name">{{ FUNC_MAP[func] }}</span>
        </div>
        <div class="tc-value mono">{{ value }}</div>
        <div v-if="config.notes[func]" class="tc-note">{{ config.notes[func] }}</div>
      </div>
    </div>
  </div>
</template>
