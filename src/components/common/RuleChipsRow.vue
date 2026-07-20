<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleChipsRow · 命中规则代码徽章条
   小徽章横排,C/D/S 分色,悬停显示规则名。
   ═══════════════════════════════════════════════════════════════ */
import { computed, onMounted } from "vue";
import { ruleNameMapRef, initRuleMetaMap } from "../../data/rules-api.js";

const props = defineProps({
  rules: { type: Array, default: () => [] },
  maxShow: { type: Number, default: 8 },
});

onMounted(() => {
  initRuleMetaMap();
});

const seriesOf = (code) => (code.startsWith("C") ? "C" : code.startsWith("D") ? "D" : "S");

const shown = computed(() => props.rules.slice(0, props.maxShow));
const overflow = computed(() => props.rules.length - shown.value.length);
</script>

<template>
  <span v-if="!rules || rules.length === 0" class="rule-chips-empty">无命中</span>
  <div v-else class="rule-chips-row">
    <span
      v-for="(code, i) in shown"
      :key="i"
      class="rule-chip"
      :class="`series-${seriesOf(code)}`"
      :title="ruleNameMapRef[code] || code"
    >
      {{ code }}
    </span>
    <span v-if="overflow > 0" class="rule-chip overflow mono">+{{ overflow }}</span>
  </div>
</template>
