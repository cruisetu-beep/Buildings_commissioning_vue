<script setup>
/* ═══════════════════════════════════════════════════════════════
   LeftFilterPanel · 左侧筛选面板
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import { FUNC_MAP } from "../../data/func-map.js";

const emit = defineEmits(["reset"]);
const filters = defineModel({ required: true }); // { funcs, hitMin, hitMax, archives }

const funcEntries = Object.entries(FUNC_MAP).filter(([k]) => k !== "BY");

const toggleFunc = (code) => {
  filters.value.funcs = filters.value.funcs.includes(code)
    ? filters.value.funcs.filter((x) => x !== code)
    : [...filters.value.funcs, code];
};

const activeCount = computed(() => filters.value.funcs.length);
</script>

<template>
  <div class="left-filter-panel">
    <div class="lfp-head">
      <div class="lfp-head-title">
        <Icon name="filter" :size="14" stroke="var(--brand)" />
        <span>筛选</span>
        <span v-if="activeCount > 0" class="lfp-active-count mono">{{ activeCount }}</span>
      </div>
      <button v-if="activeCount > 0" class="lfp-reset" @click="emit('reset')">
        <Icon name="x" :size="11" /> 重置
      </button>
    </div>

    <!-- 业态多选 -->
    <div class="lfp-group">
      <div class="lfp-group-label">
        <span>业态编码</span>
        <span class="lfp-group-hint mono">{{ filters.funcs.length || "全选" }}</span>
      </div>
      <div class="func-check-grid">
        <label
          v-for="[code, name] in funcEntries"
          :key="code"
          class="func-check"
          :class="{ on: filters.funcs.includes(code) }"
        >
          <input type="checkbox" :checked="filters.funcs.includes(code)" @change="toggleFunc(code)" />
          <span class="func-check-code mono">{{ code }}</span>
          <span class="func-check-name">{{ name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
