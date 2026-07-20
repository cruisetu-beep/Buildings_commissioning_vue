<script setup>
/* ═══════════════════════════════════════════════════════════════
   LeftFilterPanel · 左侧筛选面板
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted } from "vue";
import Icon from "../icons/Icon.vue";
import { FUNC_MAP } from "../../data/func-map.js";
import { fetchRules, ruleNameMapRef, initRuleMetaMap } from "../../data/rules-api.js";

const emit = defineEmits(["reset"]);
const filters = defineModel({ required: true }); // { funcs, hitMin, hitMax, archives, rules }

const funcEntries = Object.entries(FUNC_MAP).filter(([k]) => k !== "BY");

const toggleFunc = (code) => {
  filters.value.funcs = filters.value.funcs.includes(code)
    ? filters.value.funcs.filter((x) => x !== code)
    : [...filters.value.funcs, code];
};

const toggleSelectAllFuncs = () => {
  const allCodes = funcEntries.map(([code]) => code);
  const allSelected = allCodes.every((code) => filters.value.funcs.includes(code));
  filters.value.funcs = allSelected ? [] : allCodes;
};

/* ─── 命中具体规则(对接后端数据库，动态从接口获取) ─── */
const rulesList = ref([]);

onMounted(async () => {
  rulesList.value = await fetchRules();
  initRuleMetaMap();
});

const cCodes = computed(() => {
  return rulesList.value
    .filter((r) => r.ruleCode && r.ruleCode.startsWith("C"))
    .map((r) => r.ruleCode);
});

const dCodes = computed(() => {
  return rulesList.value
    .filter((r) => r.ruleCode && r.ruleCode.startsWith("D"))
    .map((r) => r.ruleCode);
});

const sGroups = computed(() => {
  const groups = [];
  const index = {};
  const sRules = rulesList.value.filter(
    (r) => r.ruleCode && !r.ruleCode.startsWith("C") && !r.ruleCode.startsWith("D")
  );
  sRules.forEach((r) => {
    const func = r.ruleCode.split("-")[0];
    if (!(func in index)) {
      index[func] = groups.length;
      groups.push({ func, codes: [] });
    }
    groups[index[func]].codes.push(r.ruleCode);
  });
  return groups;
});

const sCodes = computed(() => sGroups.value.flatMap((g) => g.codes));

const sExpanded = ref(false);

const toggleRule = (code) => {
  filters.value.rules = filters.value.rules.includes(code)
    ? filters.value.rules.filter((x) => x !== code)
    : [...filters.value.rules, code];
};

const selectAllInSeries = (codes) => {
  const arr = Array.isArray(codes) ? codes : (codes.value || []);
  const allSelected = arr.every((c) => filters.value.rules.includes(c));
  filters.value.rules = allSelected
    ? filters.value.rules.filter((c) => !arr.includes(c))
    : [...new Set([...filters.value.rules, ...arr])];
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
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>业态编码</span>
          <button class="rf-select-all" @click="toggleSelectAllFuncs">全选</button>
        </div>
        <span class="lfp-group-hint mono" v-if="filters.funcs.length">{{ filters.funcs.length }}</span>
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
        <span class="lfp-group-hint mono" v-if="filters.rules.length">{{ filters.rules.length }}</span>
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
          :title="ruleNameMapRef[code] || code"
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
          :title="ruleNameMapRef[code] || code"
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
              :title="ruleNameMapRef[code] || code"
            >{{ code }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
