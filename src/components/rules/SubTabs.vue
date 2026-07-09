<script setup>
/* ═══════════════════════════════════════════════════════════════
   SubTabs · C系 / D系 / S系(未启用)
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  active: { type: String, required: true },
  counts: { type: Object, required: true },
});
const emit = defineEmits(["update:active"]);

const TABS = [
  { key: "C", label: "C 系 · 通用固定规则",     desc: "全业态通用",       disabled: false },
  { key: "D", label: "D 系 · 分业态差异化规则", desc: "业态阈值差异化",   disabled: false },
  { key: "S", label: "S 系 · 业态专属专项规则", desc: "当前批次未启用",   disabled: true },
];
</script>

<template>
  <div class="sub-tabs">
    <button
      v-for="t in TABS"
      :key="t.key"
      class="sub-tab"
      :class="{ active: active === t.key, disabled: t.disabled }"
      @click="emit('update:active', t.key)"
    >
      <div class="sub-tab-main">
        <span class="sub-tab-label">{{ t.label }}</span>
        <span class="sub-tab-count mono">{{ counts[t.key] }}</span>
      </div>
      <div class="sub-tab-desc">
        <Icon v-if="t.disabled" name="lock" :size="10" stroke="#94a3b8" />
        <span>{{ t.desc }}</span>
      </div>
    </button>
  </div>
</template>
