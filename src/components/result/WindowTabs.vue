<script setup>
/* ═══════════════════════════════════════════════════════════════
   WindowTabs · 窗口标签页切换
   ═══════════════════════════════════════════════════════════════ */
defineProps({
  windows: { type: Array, required: true },
  activeIdx: { type: Number, required: true },
});
const emit = defineEmits(["update:activeIdx"]);
</script>

<template>
  <div v-if="windows.length > 0" class="window-tabs">
    <button
      v-for="(w, i) in windows"
      :key="i"
      class="wt-tab"
      :class="{ active: activeIdx === i, triggered: w.isTriggered }"
      @click="emit('update:activeIdx', i)"
    >
      <span class="wt-tab-label">{{ w.label }}</span>
      <span class="wt-tab-status">
        <template v-if="w.isTriggered"><span class="wt-dot trig" />触发</template>
        <template v-else><span class="wt-dot ok" />未触发</template>
      </span>
    </button>
  </div>
</template>
