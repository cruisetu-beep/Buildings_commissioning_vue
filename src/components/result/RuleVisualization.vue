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
  dateFrom: { type: String, default: "" },
  dateTo: { type: String, default: "" },
  windowIdx: { type: Number, default: 0 }
});

const viewMode = ref("chart"); // "chart" | "data"

const option = computed(() => buildChartOption(props.visualType, props.chart));

// 精准研判图表是否存在可绘制的真实核心点集
const hasChartData = computed(() => {
  const c = props.chart;
  if (!c || Object.keys(c).length === 0) return false;
  
  switch (props.visualType) {
    case "A": return (c.low && c.low.length > 0) || (c.high && c.high.length > 0);
    case "B": return c.points && c.points.length > 0;
    case "C": return c.series && c.series.length > 0;
    case "D": return c.buckets && c.buckets.length > 0;
    case "E": return (c.seriesA?.data && c.seriesA.data.length > 0) || (c.seriesB?.data && c.seriesB.data.length > 0);
    default: return false;
  }
});

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
      <!-- 统一空状态判断：若无任何有效测算点 -->
      <div v-if="!hasChartData" class="viz-chart-empty-state" :style="{ minHeight: '420px', width: '100%' }">
        <Icon name="flask" :size="22" stroke="var(--text-3)" />
        <span class="viz-empty-text">该窗口暂无可用测算点以生成分析数据</span>
        <span class="viz-empty-sub">可能原因为分析时间内设备未开启运行，或未采集到气象数据</span>
      </div>
      
      <!-- 有数据状态下的分流渲染 -->
      <template v-else>
        <EChartsWidget v-if="viewMode === 'chart'" :option="option" :min-height="420" />
        <RawDataView
          v-else
          :min-height="420"
          :visual-type="visualType"
          :chart="chart"
          :date-from="dateFrom"
          :date-to="dateTo"
          :window-idx="windowIdx"
          :raw-data="chart?.rawDataPoints || []"
          :target-temp="chart?.targetTemp || '—'"
        />
      </template>
    </div>
  </div>
</template>
