<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingDetailV2Page · 判定结果 4.3 建筑详情（新版）

   与 BuildingDetailPage 并存，路由 /result-v2/:id。
   取数逻辑完全复用 fetchBuildingById，只重做呈现：
     - 头部标签并入标题行（省一行）
     - 左栏分组可折叠、计数分级
     - 主栏改判决书式顺序：结论 → 计算过程 → 建议核查 → 判定依据 → 算法
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import RuleOutlineV2 from "../../components/result/v2/RuleOutlineV2.vue";
import RuleDetailAreaV2 from "../../components/result/v2/RuleDetailAreaV2.vue";
import BuildingInfoPanel from "../../components/result/BuildingInfoPanel.vue";
import RuleDetailModal from "../../components/result/RuleDetailModal.vue";
import { fetchBuildingById } from "../../data/buildings-api.js";
import { initRuleMetaMap } from "../../data/rules-api.js";

import "../../assets/styles/building-detail.css";
import "../../assets/styles/building-detail-v2.css";

const route = useRoute();
const router = useRouter();

const building = ref(null);
const loading = ref(true);
const results = ref([]);
const nodes = ref([]);
const activeCode = ref(null);
const ruleDetailCode = ref(null);

onMounted(async () => {
  await initRuleMetaMap();
  const data = await fetchBuildingById(route.params.id, 2025);
  if (data) {
    building.value = data.building;
    results.value = data.results;
    nodes.value = data.nodes;

    const target = results.value.find((r) => r.category === "目标调适");
    activeCode.value = target
      ? target.ruleCode
      : (results.value.find((r) => r.validCount > 0) || results.value[0])?.ruleCode;
  }
  loading.value = false;
});

const activeResult = computed(() => results.value.find((r) => r.ruleCode === activeCode.value));
const targetCount = computed(() => results.value.filter((r) => r.category === "目标调适").length);
const normalCount = computed(() => results.value.filter((r) => r.category === "正常").length);
</script>

<template>
  <div v-if="building" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑详情（新版）']" />

    <!-- 头部：楼名 / 编号 / 业态 / 统计 全部并入一行 -->
    <div class="v2-head">
      <span class="v2-head-dot" />
      <h1>楼宇调适详情 — {{ building.name }}</h1>
      <span class="v2-bcode mono">{{ building.buildId }}</span>
      <span class="v2-head-sep" />
      <span class="v2-pill">{{ building.buildFunc }}　{{ building.buildFuncName }}</span>
      <span class="v2-pill target">目标调适命中：{{ targetCount }} 条</span>
      <span class="v2-pill normal">正常规则：{{ normalCount }} 条</span>
      <button class="btn ghost sm v2-head-back" @click="router.push(`/result/${building.buildId}`)">
        回旧版
      </button>
    </div>

    <div class="v2-two-col">
      <div class="v2-left">
        <BuildingInfoPanel :building="building" :nodes="nodes" :active-result="activeResult" />
        <RuleOutlineV2 :results="results" :active-code="activeCode" @select="(c) => (activeCode = c)" />
      </div>
      <div class="v2-mid card glow">
        <RuleDetailAreaV2 :result="activeResult" @open-detail="(c) => (ruleDetailCode = c)" />
      </div>
    </div>

    <RuleDetailModal
      v-if="ruleDetailCode"
      :rule-id="ruleDetailCode"
      :rule-name="activeResult?.ruleName || ''"
      @close="ruleDetailCode = null"
    />
  </div>

  <div v-else-if="!loading" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑详情（新版）']" />
    <div class="card glow" style="padding: 60px; text-align: center; color: var(--text-2)">
      未找到该建筑(ID: {{ route.params.id }})
    </div>
  </div>
</template>
