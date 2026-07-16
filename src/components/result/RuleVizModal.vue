<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleVizModal · 从 4.3 建筑详情页弹出的算法可视化
   复用 4 个内层组件:RuleVisualization / VerdictCard / MetricsPanel / WindowInfoPanel
   建筑 + 规则 只读上下文,分析窗口可切(mock 里只 1/3 有数据)。

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
import { VIZ_RULES } from "../../data/viz-data.js";

import "../../assets/styles/rule-viz.css";

const props = defineProps({
  ruleCode: { type: String, required: true },
  building: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const windowIdx = ref(0);

const ruleIdx = computed(() => VIZ_RULES.findIndex((r) => r.code === props.ruleCode));
const rule = computed(() => (ruleIdx.value >= 0 ? VIZ_RULES[ruleIdx.value] : null));
</script>

<template>
  <Teleport to="body">
    <!-- 未实现的规则兜底(RuleDetailArea 已用 hasChart 拦截,这里只是防御) -->
    <div v-if="!rule" class="modal-overlay" @click="emit('close')">
      <div class="modal-card float-in modal-sm" @click.stop>
        <div class="modal-head">
          <div class="modal-title-row">
            <Icon name="lock" :size="18" stroke="var(--text-3)" />
            <div>
              <h3 class="modal-title">该规则的可视化待第二批实现</h3>
              <div class="modal-sub">第一批仅覆盖 <b class="mono">C01 · D01 · D02 · C04</b></div>
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
            <div class="viz-ctx-value mono" :title="`${rule.code} · ${rule.name}`">{{ rule.code }} · {{ rule.name }}</div>
          </div>
          <div class="viz-ctx-item">
            <label><Icon name="target" :size="11" /> 分析窗口</label>
            <select class="viz-sel-select mono" v-model="windowIdx">
              <option :value="0">1/3 · {{ rule.data.windowLabel.split("·")[1]?.trim() || "2025-07-15 至 07-17" }}</option>
              <option :value="1" disabled>2/3 · 2025-07-22 至 07-24(占位)</option>
              <option :value="2" disabled>3/3 · 2025-07-29 至 07-31(占位)</option>
            </select>
          </div>
        </div>

        <!-- 主体:复用 viz-two-col -->
        <div class="viz-modal-body">
          <div class="viz-two-col">
            <div class="viz-left card glow">
              <RuleVisualization :rule="rule" :context-override="{ buildId: building.buildId, name: building.name }" />
            </div>
            <div class="viz-right">
              <VerdictCard :triggered="rule.data.triggered" :conclusion="rule.data.conclusion" :rule-code="rule.code" />
              <MetricsPanel :metrics="rule.data.metrics" />
              <WindowInfoPanel :info="rule.data.windowInfo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
