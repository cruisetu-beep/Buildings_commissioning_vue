<script setup>
/* ═══════════════════════════════════════════════════════════════
   ManualCollapse · 规则手册原文折叠区
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import { getManual } from "../../data/rules-api.js";

const props = defineProps({
  rule: { type: Object, required: true },
});

const expanded = ref(false);
const manual = computed(() => getManual(props.rule));
</script>

<template>
  <div class="manual-collapse" :class="{ expanded }">
    <button class="collapse-head" @click="expanded = !expanded">
      <div class="collapse-head-left">
        <Icon :name="expanded ? 'chevron-d' : 'chevron-r'" :size="13" />
        <Icon name="rules" :size="14" stroke="var(--brand)" />
        <span class="collapse-title">规则手册原文</span>
      </div>
      <span class="collapse-hint">
        摘自《楼宇调适判定规则手册 v2.0》· {{ rule.ruleCode }} 章节
      </span>
    </button>

    <div v-if="expanded" class="collapse-body">
      <div class="manual-section">
        <div class="manual-section-title"><span class="section-num mono">1</span>判定标准</div>
        <div class="manual-content">{{ manual.judgment }}</div>
      </div>

      <div class="manual-section">
        <div class="manual-section-title"><span class="section-num mono">2</span>计算方法</div>
        <ol class="manual-list">
          <li v-for="(step, i) in manual.method" :key="i">{{ step }}</li>
        </ol>
      </div>

      <div class="manual-section">
        <div class="manual-section-title"><span class="section-num mono">3</span>自动选窗策略</div>
        <div class="manual-content">{{ manual.window }}</div>
      </div>

      <div class="manual-section">
        <div class="manual-section-title"><span class="section-num mono">4</span>节点要求</div>
        <div class="manual-nodes">
          <div v-for="(n, i) in manual.nodes" :key="i" class="manual-node-row">
            <span class="manual-node-period">{{ n.period }}</span>
            <span class="manual-node-req mono">{{ n.req }}</span>
          </div>
        </div>
      </div>

      <div class="manual-section">
        <div class="manual-section-title"><span class="section-num mono">5</span>差异化说明</div>
        <div class="manual-content">{{ manual.differentiation }}</div>
      </div>
    </div>
  </div>
</template>
