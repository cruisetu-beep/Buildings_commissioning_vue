<script setup>
/* ═══════════════════════════════════════════════════════════════
   Breadcrumb
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  items: { type: Array, required: true },
});
</script>

<template>
  <div class="breadcrumb">
    <template v-for="(it, i) in items" :key="i">
      <span class="crumb" :class="{ active: i === items.length - 1 }">{{ it }}</span>
      <Icon v-if="i < items.length - 1" name="chevron-r" :size="12" stroke="#97a4c0" />
    </template>
  </div>
</template>
