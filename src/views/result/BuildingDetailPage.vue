<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingDetailPage · 页面 4.3 建筑详情
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import BuildFuncTag from "../../components/common/BuildFuncTag.vue";
import RuleOutlineList from "../../components/result/RuleOutlineList.vue";
import RuleDetailArea from "../../components/result/RuleDetailArea.vue";
import BuildingInfoPanel from "../../components/result/BuildingInfoPanel.vue";
import RuleVizModal from "../../components/result/RuleVizModal.vue";
import { fetchBuildingById } from "../../data/buildings-api.js";
import { genBuildingRuleResults, genNodeCoverage } from "../../data/building-detail-data.js";

import "../../assets/styles/building-detail.css";

const route = useRoute();
const router = useRouter();

const building = ref(null);
const loading = ref(true);

const results = ref([]);
const nodes = ref([]);
const activeCode = ref(null);

// 算法可视化弹窗 · 由 RuleDetailArea 里的"计算过程"按钮打开
const vizModalCode = ref(null);

onMounted(async () => {
  building.value = await fetchBuildingById(route.params.id);
  loading.value = false;
  if (building.value) {
    results.value = genBuildingRuleResults(building.value);
    nodes.value = genNodeCoverage(building.value);
    const target = results.value.find((r) => r.category === "目标调适");
    activeCode.value = target ? target.ruleCode : (results.value.find((r) => r.validCount > 0) || results.value[0])?.ruleCode;
  }
});

const activeResult = computed(() => results.value.find((r) => r.ruleCode === activeCode.value));
const targetCount = computed(() => results.value.filter((r) => r.category === "目标调适").length);
const normalCount = computed(() => results.value.filter((r) => r.category === "正常").length);

const onBack = () => router.push("/result");

const handleJumpToViz = (ruleCode) => {
  vizModalCode.value = ruleCode;
};
</script>

<template>
  <div v-if="building" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑清单', building.buildId]" />

    <!-- 头部 -->
    <div class="bd-head">
      <button class="bd-back-btn" title="返回建筑清单" @click="onBack">
        <Icon name="chevron-l" :size="13" />
        <span>返回</span>
      </button>

      <div class="bd-head-main">
        <div class="bd-head-title-row">
          <span class="bd-head-id display mono">{{ building.buildId }}</span>
          <span class="bd-head-name">{{ building.name }}</span>
        </div>
        <div class="bd-head-stats">
          <BuildFuncTag :func="building.buildFunc" :func-name="building.buildFuncName" />
          <div class="bd-stat-chip target">
            <Icon name="target" :size="12" stroke="var(--status-target)" />
            <span>目标调适命中</span>
            <b class="bd-stat-num mono">{{ targetCount }}</b>
            <span>条</span>
          </div>
          <div class="bd-stat-chip normal">
            <Icon name="check" :size="12" stroke="var(--status-normal)" />
            <span>正常规则</span>
            <b class="bd-stat-num mono">{{ normalCount }}</b>
            <span>条</span>
          </div>
          <span v-if="building.nodeCoverage !== '完整'" class="node-warn mono">
            <Icon name="alert" :size="10" stroke="#d97706" />
            节点{{ building.nodeCoverage }}
          </span>
        </div>
      </div>

      <div class="bd-head-actions">
        <button class="btn ghost"><Icon name="download" :size="13" /> 导出报告</button>
      </div>
    </div>

    <!-- 两栏主体 · 左:建筑信息 + 节点覆盖 + 规则命中总览 · 中:规则详情
         (class 名沿用旧的 bd-three-col,避免波及既有选择器) -->
    <div class="bd-three-col">
      <div class="bd-left">
        <BuildingInfoPanel :building="building" :nodes="nodes" />
        <RuleOutlineList :results="results" :active-code="activeCode" @select="(c) => (activeCode = c)" />
      </div>
      <div class="bd-mid card glow">
        <RuleDetailArea :result="activeResult" @jump-to-viz="handleJumpToViz" />
      </div>
    </div>

    <!-- 算法可视化弹窗 -->
    <RuleVizModal
      v-if="vizModalCode"
      :rule-code="vizModalCode"
      :building="building"
      @close="vizModalCode = null"
    />
  </div>

  <div v-else-if="!loading" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑清单']" />
    <div class="card glow" style="padding: 60px; text-align: center; color: var(--text-2)">
      未找到该建筑(ID: {{ route.params.id }})
    </div>
  </div>
</template>

