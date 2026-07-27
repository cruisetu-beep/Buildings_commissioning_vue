<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleVizModal · 从 4.3 建筑详情页弹出的算法可视化
   复用 4 个内层组件:RuleVisualization / VerdictCard / MetricsPanel / WindowInfoPanel
   建筑 + 规则 只读上下文,分析窗口可切。图表与右栏均由该规则各窗口的
   resultJSON 驱动(v4 mock,后端 CalcResult 接口就绪后仅换取数来源)。

   必须用 <Teleport to="body"> 包裹:4.3 页(.page-view)有 .float-in 淡入动画,
   动画 fill-mode:both 让 transform 值永久留在元素上,祖先有非 none 的 transform
   会给 position:fixed 后代重造 containing block,导致遮罩/弹窗定位失效。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import RuleVisualization from "./RuleVisualization.vue";
import VerdictCard from "./VerdictCard.vue";
import MetricsPanel from "./MetricsPanel.vue";
import WindowInfoPanel from "./WindowInfoPanel.vue";
import { getVizRule, VIZ_TYPE_LABEL } from "../../data/viz-data.js";

import "../../assets/styles/rule-viz.css";

const props = defineProps({
  ruleCode: { type: String, required: true },
  building: { type: Object, required: true },
  result: { type: Object, default: null },
});
const emit = defineEmits(["close"]);

const windowIdx = ref(0);

const rule = computed(() => getVizRule(props.ruleCode));
const windows = computed(() => rule.value?.windows || []);
const activeWindow = computed(() => windows.value[windowIdx.value] || null);
const rj = computed(() => activeWindow.value?.resultJSON || null);

const displayName = computed(() => props.result?.ruleName || rule.value?.name || "");
const activePeriodStr = computed(() => {
  const w = activeWindow.value;
  if (!w) return "";
  return `${windowIdx.value + 1}/${windows.value.length} · ${w.period}`;
});

// 右栏三面板均取自当前窗口 resultJSON
const triggered = computed(() => rj.value?.category === "目标调适");
const conclusion = computed(() => rj.value?.reason || "");
const metrics = computed(() => rj.value?.metrics || []);
const windowInfo = computed(() => rj.value?.windowInfo || {});
</script>

<template>
  <Teleport to="body">
    <!-- 无 viz 数据兜底(RuleDetailArea 已用 hasVizChart 拦截,这里只是防御) -->
    <div v-if="!rule" class="modal-overlay" @click="emit('close')">
      <div class="modal-card float-in modal-sm" @click.stop>
        <div class="modal-head">
          <div class="modal-title-row">
            <Icon name="lock" :size="18" stroke="var(--text-3)" />
            <div>
              <h3 class="modal-title">该规则的计算过程可视化待接入</h3>
              <div class="modal-sub">规则 <b class="mono">{{ ruleCode }}</b> 的计算过程数据尚未提供</div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn primary" @click="emit('close')"><Icon name="check" :size="13" /> 好的</button>
        </div>
      </div>
    </div>

    <div v-else class="modal-overlay" @click="emit('close')">
      <div class="modal-card modal-viz float-in" @click.stop>
        <!-- 头 -->
        <div class="modal-head viz-modal-head">
          <div class="viz-modal-title-row">
            <Icon name="flask" :size="16" stroke="var(--brand)" />
            <h3 class="modal-title">规则算法可视化</h3>
            <span class="viz-type-badge mono">{{ rule.visualType }} · {{ VIZ_TYPE_LABEL[rule.visualType] }}{{ rule.isSample ? " · 示例" : "" }}</span>
          </div>
          <button class="viz-modal-close" title="关闭" @click="emit('close')">
            <Icon name="x" :size="14" />
          </button>
        </div>

        <!-- 顶部只读上下文 · 建筑 + 规则 锁定 · 窗口可切 -->
        <div class="viz-modal-ctx">
          <div class="viz-ctx-item">
            <label><Icon name="building" :size="11" /> 建筑</label>
            <div class="viz-ctx-value mono" :title="`${building.buildId} · ${building.name}`">
              {{ building.buildId }} · {{ building.name }}
            </div>
          </div>
          <div class="viz-ctx-item">
            <label><Icon name="rules" :size="11" /> 规则</label>
            <div class="viz-ctx-value mono" :title="`${rule.code} · ${displayName}`">{{ rule.code }} · {{ displayName }}</div>
          </div>
          <div class="viz-ctx-item">
            <label><Icon name="target" :size="11" /> 分析窗口</label>
            <select class="viz-sel-select mono" v-model="windowIdx">
              <option v-for="(w, idx) in windows" :key="idx" :value="idx">
                {{ idx + 1 }}/{{ windows.length }} · {{ w.period }}
              </option>
            </select>
          </div>
        </div>

        <!-- 主体:复用 viz-two-col -->
        <div class="viz-modal-body">
          <div class="viz-two-col">
            <div class="viz-left card glow">
              <RuleVisualization
                :rule-code="rule.code"
                :rule-name="displayName"
                :visual-type="rule.visualType"
                :chart="rj?.chart || {}"
                :build-id="building.buildId"
                :building-name="building.name"
                :window-label="activePeriodStr"
              />
            </div>
            <div class="viz-right">
              <VerdictCard :triggered="triggered" :conclusion="conclusion" :rule-code="rule.code" />
              <MetricsPanel :metrics="metrics" />
              <WindowInfoPanel :info="windowInfo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
