<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleVisualization · 根据规则类型分发到对应图表
   支持"图表视图 / 原始数据视图"切换
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import EChartsWidget from "../common/EChartsWidget.vue";
import RawDataView from "./RawDataView.vue";
import {
  buildKMeansOption,
  buildRegressionOption,
  buildDualBarOption,
  buildHistogramOption,
} from "../../data/viz-chart-options.js";

const props = defineProps({
  rule: { type: Object, required: true }, // { code, name, chartType, data }
  contextOverride: { type: Object, default: null }, // { buildId, name }
  windowLabelOverride: { type: String, default: "" },
});

const viewMode = ref("chart"); // "chart" | "data"

const option = computed(() => {
  switch (props.rule.chartType) {
    case "kmeans":
      return buildKMeansOption(props.rule.data);
    case "regression":
      return buildRegressionOption(props.rule.data);
    case "dualbar":
      return buildDualBarOption(props.rule.data);
    case "histogram":
      return buildHistogramOption(props.rule.data);
    default:
      return {};
  }
});

// 切换规则时自动回到图表视图
watch(
  () => props.rule.code,
  () => {
    viewMode.value = "chart";
  }
);

// 副标题里的建筑上下文:调用方(如 Modal 从 4.3 建筑详情页开)可传 contextOverride 覆盖
const displayBuildId = computed(() => props.contextOverride?.buildId || props.rule.data.buildId);
const displayBuildName = computed(() => props.contextOverride?.name || props.rule.data.buildingName);
</script>

<template>
  <div class="viz-chart-wrap">
    <div class="viz-chart-head">
      <div>
        <div class="viz-chart-title">
          <span class="viz-chart-code mono">{{ rule.code }}</span>
          <span>{{ rule.name }}</span>
        </div>
        <div class="viz-chart-sub">
          <Icon name="building" :size="11" stroke="var(--text-2)" />
          <span class="mono">{{ displayBuildId }}</span>
          <span>· {{ displayBuildName }}</span>
          <span class="chart-sub-sep">·</span>
          <Icon name="target" :size="11" stroke="var(--text-2)" />
          <span>{{ windowLabelOverride || rule.data.windowLabel }}</span>
        </div>
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
