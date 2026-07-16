<script setup>
/* ═══════════════════════════════════════════════════════════════
   EChartsWidget · 通用图表容器
   自动处理 init / setOption / resize / dispose 生命周期

   height 传入具体像素 → 固定高度
   height 不传          → 自适应父容器高度(父容器需 flex:1 + min-height)
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import * as echarts from "echarts";
import Icon from "../icons/Icon.vue";

const props = defineProps({
  option: { type: Object, default: null },
  height: { type: [String, Number], default: null },
  minHeight: { type: [String, Number], default: 380 },
  notMerge: { type: Boolean, default: true },
});

const containerRef = ref(null);
let chart = null;
let disposed = false;

const error = ref(null);

const px = (v) => (typeof v === "number" ? `${v}px` : v);

const style = computed(() =>
  props.height
    ? { width: "100%", height: px(props.height), minHeight: px(props.height) }
    : { width: "100%", height: "100%", minHeight: px(props.minHeight) }
);

const handleResize = () => {
  if (chart) chart.resize();
};

onMounted(async () => {
  await nextTick(); // 确保容器已完成 layout,否则图画不出来
  if (disposed || !containerRef.value) return;
  try {
    chart = echarts.init(containerRef.value);
    if (props.option) chart.setOption(props.option, props.notMerge);
  } catch (e) {
    error.value = "图表初始化失败:" + e.message;
    console.error("[EChartsWidget] init error:", e);
  }
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener("resize", handleResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});

// option 变化时重新 setOption
watch(
  () => props.option,
  (opt) => {
    if (chart && opt) {
      try {
        chart.setOption(opt, props.notMerge);
      } catch (e) {
        console.error("[EChartsWidget] setOption error:", e);
      }
    }
  }
);
</script>

<template>
  <div v-if="error" class="echarts-widget echarts-error" :style="style">
    <Icon name="alert" :size="32" stroke="var(--danger)" />
    <div class="echarts-error-title">图表加载失败</div>
    <div class="echarts-error-msg">{{ error }}</div>
    <div class="echarts-error-hint">按 F12 打开控制台查看具体错误,或刷新页面重试</div>
  </div>
  <div v-else ref="containerRef" class="echarts-widget" :style="style"></div>
</template>
