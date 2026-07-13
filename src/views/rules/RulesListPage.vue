<script setup>
/* ═══════════════════════════════════════════════════════════════
   RulesListPage · 页面 1.1 判定规则清单
   ═══════════════════════════════════════════════════════════════ */
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import SubTabs from "../../components/rules/SubTabs.vue";
import SSeriesBanner from "../../components/rules/SSeriesBanner.vue";
import FilterBar from "../../components/rules/FilterBar.vue";
import RulesTable from "../../components/rules/RulesTable.vue";
import { fetchRules, updateRule } from "../../data/rules-api.js";

const router = useRouter();

const tab = ref(sessionStorage.getItem("rules_active_tab") || "C");
const filters = reactive({ q: "", priority: "all", enabled: "all" });
const selectedIds = ref([]);
const rules = ref([]);
const loading = ref(true);

onMounted(async () => {
  rules.value = await fetchRules();
  loading.value = false;
});

const counts = computed(() => ({
  C: rules.value.filter((r) => r.series === "C").length,
  D: rules.value.filter((r) => r.series === "D").length,
  S: rules.value.filter((r) => r.series === "S").length,
}));

const filtered = computed(() => {
  return rules.value.filter((r) => {
    if (r.series !== tab.value) return false;
    if (filters.priority !== "all" && r.priority !== filters.priority) return false;
    if (filters.enabled === "enabled" && !r.isEnabled) return false;
    if (filters.enabled === "disabled" && r.isEnabled) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (
        !r.name.includes(filters.q) &&
        !r.cxRuleId.toLowerCase().includes(q) &&
        !r.ruleCode.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
});

const totalInTab = computed(() => counts.value[tab.value] || 0);
const sSeriesLocked = computed(() => tab.value === "S");

// 切 tab 时清空选择并持久化 tab 状态
watch(tab, (newVal) => {
  sessionStorage.setItem("rules_active_tab", newVal);
  selectedIds.value = [];
});

const allSelected = computed(
  () => filtered.value.length > 0 && filtered.value.every((r) => selectedIds.value.includes(r.cxRuleId))
);

const toggleSelect = (id) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id];
};
const toggleSelectAll = (checked) => {
  if (sSeriesLocked.value) return;
  selectedIds.value = checked ? filtered.value.map((r) => r.cxRuleId) : [];
};
const onToggleEnable = async (id, v) => {
  rules.value = rules.value.map((r) => (r.cxRuleId === id ? { ...r, isEnabled: v } : r));
  await updateRule(id, { isEnabled: v });
};
const onBulkEnable = async () => {
  rules.value = rules.value.map((r) => (selectedIds.value.includes(r.cxRuleId) ? { ...r, isEnabled: true } : r));
  await Promise.all(selectedIds.value.map((id) => updateRule(id, { isEnabled: true })));
};
const onBulkDisable = async () => {
  rules.value = rules.value.map((r) => (selectedIds.value.includes(r.cxRuleId) ? { ...r, isEnabled: false } : r));
  await Promise.all(selectedIds.value.map((id) => updateRule(id, { isEnabled: false })));
};

const onOpenEdit = (rule) => {
  router.push(`/rules/${rule.cxRuleId}`);
};

const onOpenCreate = () => {
  router.push("/rules/new");
};
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定规则', '规则清单']" />

    <div class="page-head">
      <div>
        <h1 class="page-title">
          <Icon name="rules" :size="22" stroke="var(--brand)" />
          判定规则
        </h1>
        <div class="page-subtitle" style="max-width: 1050px;">
          共 <b>{{ rules.length }} 条</b> 调适判定规则，分为
          <b class="mono" style="color: var(--series-c)">C 系 {{ counts.C }} 条(通用)</b>、
          <b class="mono" style="color: var(--series-d)">D 系 {{ counts.D }} 条(差异化)</b>、
          <b class="mono" style="color: var(--series-s)">S 系 {{ counts.S }} 条(业态专属,未启用)</b>。
          规则定义存储于 <code class="inline-code mono">T_ST_CxRule</code>。
        </div>
      </div>
      <div class="page-head-actions">
        <button class="btn ghost"><Icon name="upload" :size="14" /> 导入规则</button>
        <button class="btn primary" @click="onOpenCreate"><Icon name="plus" :size="14" /> 新增规则</button>
      </div>
    </div>

    <div class="card glow rules-body">
      <SubTabs :active="tab" :counts="counts" @update:active="(v) => (tab = v)" />

      <SSeriesBanner v-if="sSeriesLocked" :count="counts.S" />

      <FilterBar
        v-model="filters"
        :filtered-count="filtered.length"
        :total-count="totalInTab"
        :selected-count="selectedIds.length"
        :s-series-read-only="sSeriesLocked"
        @bulk-enable="onBulkEnable"
        @bulk-disable="onBulkDisable"
      />

      <RulesTable
        :rules="filtered"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :s-series-locked="sSeriesLocked"
        @toggle-select="toggleSelect"
        @toggle-select-all="toggleSelectAll"
        @toggle-enable="onToggleEnable"
        @edit="onOpenEdit"
      />

      <div class="table-footer">
        <div class="footer-hint">
          <Icon name="info" :size="12" stroke="#6a7da3" />
          <span>规则的判定标准、计算方法、自动选窗策略等详细信息请在 <b>规则详情页(1.2)</b> 查看和编辑</span>
        </div>
        <div class="footer-meta mono">
          数据源:<code class="inline-code">T_ST_CxRule</code> · {{ rules.length }} rows · 最后更新 2026-06-29
        </div>
      </div>
    </div>
  </div>
</template>
