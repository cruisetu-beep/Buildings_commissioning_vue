<script setup>
/* ═══════════════════════════════════════════════════════════════
   LeftFilterPanel · 左侧筛选面板
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import { FUNC_MAP } from "../../data/func-map.js";
import { RULES_META_STATIC } from "../../data/rules-meta-static.js";

const emit = defineEmits(["reset"]);
const filters = defineModel({ required: true }); // { funcs, hitMin, hitMax, archives, rules }

const funcEntries = Object.entries(FUNC_MAP).filter(([k]) => k !== "BY");

const toggleFunc = (code) => {
  filters.value.funcs = filters.value.funcs.includes(code)
    ? filters.value.funcs.filter((x) => x !== code)
    : [...filters.value.funcs, code];
};

/* ─── 命中具体规则(34条:C系列8 + D系列5 + S系列21,按业态分组) ─── */
const cCodes = RULES_META_STATIC.filter((r) => r.series === "C").map((r) => r.ruleCode);
const dCodes = RULES_META_STATIC.filter((r) => r.series === "D").map((r) => r.ruleCode);
const sGroups = (() => {
  const groups = [];
  const index = {};
  RULES_META_STATIC.filter((r) => r.series === "S").forEach((r) => {
    const func = r.ruleCode.split("-")[0];
    if (!(func in index)) {
      index[func] = groups.length;
      groups.push({ func, codes: [] });
    }
    groups[index[func]].codes.push(r.ruleCode);
  });
  return groups;
})();
const sCodes = sGroups.flatMap((g) => g.codes);

const sExpanded = ref(false);

const toggleRule = (code) => {
  filters.value.rules = filters.value.rules.includes(code)
    ? filters.value.rules.filter((x) => x !== code)
    : [...filters.value.rules, code];
};

const selectAllInSeries = (codes) => {
  const allSelected = codes.every((c) => filters.value.rules.includes(c));
  filters.value.rules = allSelected
    ? filters.value.rules.filter((c) => !codes.includes(c))
    : [...new Set([...filters.value.rules, ...codes])];
};

const activeCount = computed(() => filters.value.funcs.length + filters.value.rules.length);
</script>

<template>
  <div class="left-filter-panel">
    <div class="lfp-head">
      <div class="lfp-head-title">
        <Icon name="filter" :size="14" stroke="var(--brand)" />
        <span>筛选</span>
        <span class="lfp-active-count mono" :class="{ 'is-hidden': activeCount === 0 }">{{ activeCount }}</span>
      </div>
      <button class="lfp-reset" :class="{ 'is-hidden': activeCount === 0 }" @click="emit('reset')">
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

    <!-- 命中具体规则 -->
    <div class="lfp-group">
      <div class="lfp-group-label">
        <span>命中具体规则</span>
        <span class="lfp-group-hint mono">{{ filters.rules.length || "全选" }}</span>
      </div>

      <div class="rf-series-row">
        <span class="rf-series-label">C系列</span>
        <button class="rf-select-all" @click="selectAllInSeries(cCodes)">全选</button>
      </div>
      <div class="rf-chip-grid">
        <button
          v-for="code in cCodes"
          :key="code"
          class="rf-chip series-c"
          :class="{ on: filters.rules.includes(code) }"
          @click="toggleRule(code)"
        >{{ code }}</button>
      </div>

      <div class="rf-series-row">
        <span class="rf-series-label">D系列</span>
        <button class="rf-select-all" @click="selectAllInSeries(dCodes)">全选</button>
      </div>
      <div class="rf-chip-grid">
        <button
          v-for="code in dCodes"
          :key="code"
          class="rf-chip series-d"
          :class="{ on: filters.rules.includes(code) }"
          @click="toggleRule(code)"
        >{{ code }}</button>
      </div>

      <div class="rf-series-row">
        <span class="rf-series-label">S系列({{ sCodes.length }}条)</span>
        <button class="rf-select-all" @click="selectAllInSeries(sCodes)">全选</button>
        <button class="rf-expand-btn" @click="sExpanded = !sExpanded">
          {{ sExpanded ? "收起" : "展开" }}
          <Icon name="chevron-d" :size="11" :style="{ transform: sExpanded ? 'rotate(180deg)' : 'none' }" />
        </button>
      </div>
      <div v-if="sExpanded" class="rf-s-groups">
        <div v-for="g in sGroups" :key="g.func" class="rf-s-row">
          <span class="rf-s-func mono">{{ g.func }}</span>
          <div class="rf-chip-grid inline">
            <button
              v-for="code in g.codes"
              :key="code"
              class="rf-chip series-s"
              :class="{ on: filters.rules.includes(code) }"
              @click="toggleRule(code)"
            >{{ code }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
