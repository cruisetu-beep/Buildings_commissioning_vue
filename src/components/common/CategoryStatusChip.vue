<script setup>
/* ═══════════════════════════════════════════════════════════════
   CategoryStatusChip · 判定分类徽章
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";

const props = defineProps({
  category: { type: String, required: true },
});

const CONFIG = {
  "目标调适": { c: "var(--status-target)", bg: "rgba(220,38,38,0.10)", bd: "rgba(220,38,38,0.30)", dotColor: "#dc2626", tip: "规则触发,判定存在调适空间 · 安排现场调适" },
  "待核查": { c: "var(--status-check)", bg: "rgba(14,165,233,0.10)", bd: "rgba(14,165,233,0.30)", dotColor: "#0ea5e9", tip: "边缘触发或数据不足 · 人工复核后决定" },
  "正常": { c: "var(--status-normal)", bg: "rgba(24,165,114,0.10)", bd: "rgba(24,165,114,0.30)", dotColor: "#18a572", tip: "未触发规则 · 无调适需求" },
  "无节点": { c: "#94a3b8", bg: "rgba(148,163,184,0.10)", bd: "rgba(148,163,184,0.25)", dotColor: "#94a3b8", tip: "缺少该规则所需的计量节点 · 不参与该规则判定" },
  "无数据": { c: "#94a3b8", bg: "rgba(203,213,225,0.20)", bd: "rgba(148,163,184,0.20)", dotColor: "#cbd5e1", tip: "窗口期内无有效数据 · 检查采集、补录后重跑" },
  "配置错误": { c: "var(--status-config)", bg: "rgba(224,139,47,0.10)", bd: "rgba(224,139,47,0.32)", dotColor: "#e08b2f", tip: "分项计量节点配置有误 · 人工修正配置后重跑" },
  "数据异常": { c: "var(--status-abnormal)", bg: "rgba(217,119,6,0.10)", bd: "rgba(217,119,6,0.32)", dotColor: "#d97706", tip: "采集过程异常导致数据不可用 · 排除异常时段后重跑" },
  "虚拟预测愈合": { c: "var(--status-healed)", bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.30)", dotColor: "#3b82f6", tip: "节点缺失,由软传感器估算后参与判定 · 结果仅供参考,优先补装表计" },
};

const config = computed(() => CONFIG[props.category]);
</script>

<template>
  <span v-if="config" class="cat-chip" :title="config.tip" :style="{ color: config.c, background: config.bg, borderColor: config.bd }">
    <span class="cat-dot" :style="{ background: config.dotColor }" />
    {{ category }}
  </span>
</template>
