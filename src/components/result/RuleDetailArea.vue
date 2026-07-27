<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailArea · 中栏 · 选中规则的完整判定详情
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import SeriesTag from "../common/SeriesTag.vue";
import PriorityChip from "../common/PriorityChip.vue";
import CategoryStatusChip from "../common/CategoryStatusChip.vue";
import WindowTabs from "./WindowTabs.vue";
import ValueRow from "./ValueRow.vue";
import { hasVizChart } from "../../data/viz-data.js";

const props = defineProps({
  result: { type: Object, default: null },
});
const emit = defineEmits(["jump-to-viz"]);

const windowIdx = ref(0);
watch(() => props.result?.ruleCode, () => { windowIdx.value = 0; });

const w = computed(() => props.result?.windows?.[windowIdx.value]);
</script>

<template>
  <div v-if="!result" class="rd-empty">
    <Icon name="chevron-l" :size="20" stroke="var(--text-3)" />
    <div>从左侧规则大纲选择一条规则查看详情</div>
  </div>

  <div v-else class="rd-area">
    <!-- 规则头 -->
    <div class="rd-head">
      <div class="rd-head-title">
        <span class="rd-code mono">{{ result.ruleCode }}</span>
        <span class="rd-name">{{ result.ruleName }}</span>
        <button v-if="hasVizChart(result.ruleCode)" class="rd-viz-btn" @click="emit('jump-to-viz', result.ruleCode)">
          <Icon name="flask" :size="13" />
          <span>计算过程</span>
        </button>
      </div>
      <div class="rd-head-tags">
        <SeriesTag :series="result.series" />
        <PriorityChip :priority="result.priority" />
        <CategoryStatusChip :category="result.category" />
        <span v-if="result.validCount > 0" class="rd-ratio-badge mono">
          触发 <b>{{ result.triggerCount }}</b> / 有效 <b>{{ result.validCount }}</b>
        </span>
      </div>
    </div>

    <!-- 判定结论 -->
    <div class="rd-conclusion" :class="{ trig: result.category === '目标调适' }">
      <Icon
        :name="result.category === '目标调适' ? 'alert' : 'info'"
        :size="14"
        :stroke="result.category === '目标调适' ? 'var(--warn)' : 'var(--brand)'"
      />
      <div class="rd-conclusion-text">
        <span>{{ result.detailResult }}</span>
        <span v-if="result.thresholdValue" class="rd-conclusion-threshold-text"> · {{ result.thresholdValue }}</span>
      </div>
    </div>

    <!-- 窗口明细(若有窗口) -->
    <template v-if="result.windows.length > 0">
      <div class="rd-section-title">
        <Icon name="target" :size="13" stroke="var(--brand)" />
        <span>窗口明细</span>
        <span class="rd-section-hint">共 {{ result.windows.length }} 个有效窗口</span>
      </div>

      <WindowTabs :windows="result.windows" :active-idx="windowIdx" @update:active-idx="(v) => (windowIdx = v)" />

      <div v-if="w" class="rd-window-content">
        <div class="rd-window-meta">
          <div>
            <span class="rd-wm-label">分析窗口</span>
            <span class="rd-wm-value mono">{{ w.period }}</span>
          </div>
          <div>
            <span class="rd-wm-label">干球均值</span>
            <span class="rd-wm-value mono">{{ w.weather.drybulb }}</span>
          </div>
          <div>
            <span class="rd-wm-label">湿球均值</span>
            <span class="rd-wm-value mono">{{ w.weather.wetbulb }}</span>
          </div>
          <div>
            <span class="rd-wm-label">窗口判定</span>
            <span class="rd-wm-value" :class="w.isTriggered ? 'trig' : 'ok'">
              {{ w.isTriggered ? "⚠ 触发" : "✓ 未触发" }}
            </span>
          </div>
        </div>

        <div class="rd-values-title">计算指标(F_Value1~{{ w.values.length }})</div>
        <div class="rd-values-list">
          <ValueRow v-for="(v, i) in w.values" :key="i" :v="v" />
        </div>
      </div>
    </template>
  </div>
</template>
