<script setup>
/* ═══════════════════════════════════════════════════════════════
   QuickFilterBar · 顶部快捷筛选按钮
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  active: { type: String, required: true },
  counts: { type: Object, required: true },
});
const emit = defineEmits(["update:active"]);

const opts = computed(() => [
  { key: "all", label: "全部建筑", hint: "共 " + props.counts.all + " 栋", color: "var(--text-1)", bg: "var(--bg-1)", bd: "var(--line)" },
  { key: "target", label: "目标调适全量", hint: "F_IsTarget = 1", color: "var(--status-target)", bg: "rgba(220,38,38,0.06)", bd: "rgba(220,38,38,0.25)" },
  { key: "check", label: "待核查", hint: "触发窗口不足", color: "var(--status-check)", bg: "rgba(14,165,233,0.06)", bd: "rgba(14,165,233,0.25)" },
  { key: "normal", label: "正常", hint: "未触发", color: "var(--status-normal)", bg: "rgba(24,165,114,0.06)", bd: "rgba(24,165,114,0.25)" },
  { key: "nodata", label: "无节点/无数据", hint: "节点缺失或无数据", color: "#94a3b8", bg: "rgba(148,163,184,0.06)", bd: "rgba(148,163,184,0.25)" },
]);
</script>

<template>
  <div class="quick-filter-bar">
    <button
      v-for="o in opts"
      :key="o.key"
      class="qf-btn"
      :class="{ active: active === o.key }"
      :style="active === o.key ? { color: o.color, background: o.bg, borderColor: o.bd } : {}"
      @click="emit('update:active', o.key)"
    >
      <div class="qf-btn-main">
        <span class="qf-dot" :style="{ background: o.color }" />
        <span>{{ o.label }}</span>
      </div>
      <div class="qf-btn-count mono" :style="active === o.key ? { color: o.color } : {}">
        {{ counts[o.key] }}
      </div>
      <div class="qf-btn-hint">{{ o.hint }}</div>
    </button>
  </div>
</template>
