<script setup>
/* ═══════════════════════════════════════════════════════════════
   VerdictCard · 判定结论(醒目)
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  triggered: { type: Boolean, required: true },
  conclusion: { type: String, required: true },
  ruleCode: { type: String, required: true },
});
</script>

<template>
  <div class="verdict-card" :class="triggered ? 'trig' : 'ok'">
    <div class="verdict-head">
      <div class="verdict-badge" :class="triggered ? 'trig' : 'ok'">
        <template v-if="triggered">
          <Icon name="alert" :size="16" stroke="#fff" />
          <span>触发</span>
        </template>
        <template v-else>
          <Icon name="check" :size="16" stroke="#fff" />
          <span>未触发</span>
        </template>
      </div>
      <div class="verdict-rule mono">{{ ruleCode }}</div>
    </div>
    <div class="verdict-body">{{ conclusion }}</div>
  </div>
</template>
