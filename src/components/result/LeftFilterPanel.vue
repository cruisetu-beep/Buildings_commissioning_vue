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

const toggleArchive = (val) => {
  filters.value.archives = filters.value.archives.includes(val)
    ? filters.value.archives.filter((x) => x !== val)
    : [...filters.value.archives, val];
};

const activeCount = computed(
  () =>
    filters.value.funcs.length +
    filters.value.archives.length +
    (filters.value.hitMin > 0 ? 1 : 0) +
    (filters.value.hitMax < 10 ? 1 : 0)
);

const setHitMin = (v) => (filters.value.hitMin = Math.max(0, Math.min(10, +v || 0)));
const setHitMax = (v) => (filters.value.hitMax = Math.max(0, Math.min(10, +v || 10)));
const setPreset = (min, max) => {
  filters.value.hitMin = min;
  filters.value.hitMax = max;
};
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

    <!-- 命中规则数范围 -->
    <div class="lfp-group">
      <div class="lfp-group-label">
        <span>命中规则数</span>
        <span class="lfp-group-hint mono">{{ filters.hitMin }} ~ {{ filters.hitMax }}</span>
      </div>
      <div class="hit-range">
        <div class="hit-range-inputs">
          <input
            type="number" min="0" max="10"
            :value="filters.hitMin"
            @input="setHitMin($event.target.value)"
            class="hit-range-num mono"
          />
          <span class="hit-range-sep">—</span>
          <input
            type="number" min="0" max="10"
            :value="filters.hitMax"
            @input="setHitMax($event.target.value)"
            class="hit-range-num mono"
          />
        </div>
        <div class="hit-range-preset">
          <button class="preset" :class="{ on: filters.hitMin === 4 && filters.hitMax === 10 }" @click="setPreset(4, 10)">≥4</button>
          <button class="preset" :class="{ on: filters.hitMin === 1 && filters.hitMax === 3 }" @click="setPreset(1, 3)">1-3</button>
          <button class="preset" :class="{ on: filters.hitMin === 0 && filters.hitMax === 0 }" @click="setPreset(0, 0)">0</button>
        </div>
      </div>
    </div>

    <!-- 具体命中规则(暂用文本提示,后续可拆展开式多选) -->
    <div class="lfp-group">
      <div class="lfp-group-label">
        <span>命中具体规则</span>
        <span class="lfp-group-hint">待第二批实现</span>
      </div>
      <div class="lfp-placeholder">
        <Icon name="lock" :size="11" stroke="#97a4c0" />
        <span>34条规则多选筛选器</span>
      </div>
    </div>

    <!-- 档案状态多选 -->
    <div class="lfp-group">
      <div class="lfp-group-label">
        <span>调适档案状态</span>
        <span class="lfp-group-hint mono">{{ filters.archives.length || "全选" }}</span>
      </div>
      <div class="archive-check-list">
        <label
          v-for="v in ['已调适', '待调适', '未登记']"
          :key="v"
          class="archive-check"
          :class="{ on: filters.archives.includes(v) }"
        >
          <input type="checkbox" :checked="filters.archives.includes(v)" @change="toggleArchive(v)" />
          <span>{{ v }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
