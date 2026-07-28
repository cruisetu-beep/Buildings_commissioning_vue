<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleVisualization · 根据可视化类型(visualType)分发到对应图表
   支持"图表视图 / 原始数据视图"切换
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import EChartsWidget from "../common/EChartsWidget.vue";
import RawDataView from "./RawDataView.vue";
import { buildChartOption } from "../../data/viz-chart-options.js";

const props = defineProps({
  ruleCode: { type: String, required: true }, // 用于切换时重置视图
  visualType: { type: String, required: true }, // A/B/C/D/E
  chart: { type: Object, default: () => ({}) },  // resultJSON.chart
  condition: { type: String, default: "" },      // 计算条件(来自窗口/接口)
});

const viewMode = ref("chart"); // "chart" | "data"

const option = computed(() => buildChartOption(props.visualType, props.chart));

// 切换规则或窗口(条件随窗口变)时自动回到图表视图
watch(
  () => [props.ruleCode, props.condition],
  () => { viewMode.value = "chart"; }
);
</script>

<template>
  <div class="viz-chart-wrap">
    <div class="viz-chart-head">
      <div class="viz-chart-condition">
        <span class="viz-cond-label">计算条件</span>
        <span class="viz-cond-value">{{ condition || "—" }}</span>
      </div>
      <div class="viz-chart-actions">
        <!-- 视图切换 toggle:图表 / 原始数据 -->
        <div class="viz-view-toggle">
          <button
            class="vvt-btn"
            :class="{ active: viewMode === 'chart' }"
            title="图表视图(定性看形态)"
            @click="viewMode = 'chart'"
          >
            <Icon name="flask" :size="12" />
            <span>图表</span>
          </button>
          <button
            class="vvt-btn"
            :class="{ active: viewMode === 'data' }"
            title="原始数据视图(定量查数值)"
            @click="viewMode = 'data'"
          >
            <Icon name="list" :size="12" />
            <span>数据</span>
          </button>
        </div>
      </div>
    </div>

    <div class="viz-chart-body">
      <EChartsWidget v-if="viewMode === 'chart'" :option="option" :min-height="420" />
      <RawDataView v-else :min-height="420" />
    </div>
  </div>
</template>
