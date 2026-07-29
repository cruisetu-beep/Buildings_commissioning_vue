<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailArea · 中栏 · 选中规则的判定详情 + 计算过程(内联)
   ───────────────────────────────────────────────────────────────
   计算过程内容(图表 + 结论/指标/窗口面板)直接内联于此,由 viz mock
   驱动(getVizRule),切换窗口时图与面板同步。方向 A:窗口内容取自 viz
   示例,后端 CalcResult 接口就绪后把 getVizRule 换为真接口即可全真。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import SeriesTag from "../common/SeriesTag.vue";
import PriorityChip from "../common/PriorityChip.vue";
import CategoryStatusChip from "../common/CategoryStatusChip.vue";
import RuleVisualization from "./RuleVisualization.vue";
import VerdictCard from "./VerdictCard.vue";
import MetricsPanel from "./MetricsPanel.vue";
import { getVizRule, VIZ_TYPE_LABEL } from "../../data/viz-data.js";
import "../../assets/styles/rule-viz.css"; // 面板样式(verdict/metrics/window/viz-chart)依赖此表

const props = defineProps({
  result: { type: Object, default: null },
});
const emit = defineEmits(["open-detail"]);

const windowIdx = ref(0);
watch(() => props.result?.ruleCode, () => { windowIdx.value = 0; });

const rule = computed(() => (props.result ? getVizRule(props.result.ruleCode) : null));
const windows = computed(() => rule.value?.windows || []);
const activeWindow = computed(() => windows.value[windowIdx.value] || null);
const rj = computed(() => activeWindow.value?.resultJSON || null);

// 结论/指标面板取自当前窗口 resultJSON
const triggered = computed(() => rj.value?.category === "目标调适");
const conclusion = computed(() => rj.value?.reason || "");
const metrics = computed(() => rj.value?.metrics || []);
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
        <button class="rd-viz-btn" title="查看规则详细" @click="emit('open-detail', result.ruleCode)">
          <Icon name="rules" :size="13" />
          <span>规则详细</span>
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

    <!-- 计算过程(viz 驱动,切换窗口同步) -->
    <template v-if="rule && windows.length">
      <div class="rd-section-title">
        <Icon name="flask" :size="13" stroke="var(--brand)" />
        <span>计算过程</span>
        <span class="viz-type-badge mono">{{ rule.visualType }} · {{ VIZ_TYPE_LABEL[rule.visualType] }}</span>
        <span class="rd-section-hint">共 {{ windows.length }} 个窗口</span>
      </div>

      <!-- 窗口切换 -->
      <div class="rd-win-tabs">
        <button
          v-for="(win, i) in windows"
          :key="i"
          class="rd-win-tab"
          :class="{ active: i === windowIdx }"
          @click="windowIdx = i"
        >
          <span class="mono">窗口 {{ i + 1 }}</span>
          <span class="rd-win-tab-period">{{ win.period }}</span>
        </button>
      </div>

      <!-- 竖排:结论 → 指标 → 图表(图在最下) -->
      <div class="rd-viz-stack">
        <VerdictCard :triggered="triggered" :conclusion="conclusion" :rule-code="rule.code" />
        <MetricsPanel :metrics="metrics" collapsible default-collapsed />
        <div class="rd-viz-chart card glow">
          <RuleVisualization
            :rule-code="rule.code"
            :visual-type="rule.visualType"
            :chart="rj?.chart || {}"
            :condition="activeWindow?.condition || '—'"
          />
        </div>
      </div>
    </template>

    <div v-else class="rd-viz-empty">
      <Icon name="lock" :size="18" stroke="var(--text-3)" />
      <span>该规则的计算过程数据待接入</span>
    </div>
  </div>
</template>
