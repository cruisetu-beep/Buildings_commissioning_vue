<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingDetailPage · 页面 4.3 建筑详情
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import BuildFuncTag from "../../components/common/BuildFuncTag.vue";
import HitCountBadge from "../../components/common/HitCountBadge.vue";
import CategoryStatusChip from "../../components/common/CategoryStatusChip.vue";
import ArchiveStatusChip from "../../components/common/ArchiveStatusChip.vue";
import RuleOutlineList from "../../components/result/RuleOutlineList.vue";
import RuleDetailArea from "../../components/result/RuleDetailArea.vue";
import BuildingInfoPanel from "../../components/result/BuildingInfoPanel.vue";
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

const onBack = () => router.push("/result");

const handleJumpToViz = (ruleCode) => {
  // 第一批未实现跨模块跳转,提示用户手动切换顶部菜单
  alert(`将跳转到 5.2 算法可视化 · ${ruleCode}\n(第一批未实现跨模块跳转,可手动点顶部"计算过程"菜单查看)`);
};
</script>

<template>
  <div v-if="building" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑清单', building.buildId]" />

    <!-- 头部 -->
    <div class="bd-head">
      <button class="back-btn" @click="onBack">
        <Icon name="chevron-l" :size="14" />
        <span>返回建筑清单</span>
      </button>

      <div class="bd-head-main">
        <div class="bd-head-title-row">
          <span class="bd-head-id display mono">{{ building.buildId }}</span>
          <span class="bd-head-name">{{ building.name }}</span>
        </div>
        <div class="bd-head-tags">
          <BuildFuncTag :func="building.buildFunc" :func-name="building.buildFuncName" />
          <HitCountBadge :count="building.hitCount" size="sm" />
          <CategoryStatusChip :category="building.category" />
          <ArchiveStatusChip :status="building.status" />
          <span v-if="building.nodeCoverage !== '完整'" class="node-warn mono">
            <Icon name="alert" :size="10" stroke="#d97706" />
            节点{{ building.nodeCoverage }}
          </span>
        </div>
        <div class="bd-head-meta">
          本次分析共命中 <b>{{ building.hitCount }}</b> 条规则(排除 D01),
          其中 <b style="color: var(--warn)">{{ results.filter((r) => r.category === "目标调适").length }}</b> 条判定为目标调适,
          <b style="color: var(--status-check)"> {{ results.filter((r) => r.category === "待核查").length }}</b> 条待核查,
          <b style="color: var(--status-normal)"> {{ results.filter((r) => r.category === "正常").length }}</b> 条正常。
          数据源 <code class="inline-code mono">T_ST_CxRuleResult</code>
        </div>
      </div>

      <div class="bd-head-actions">
        <button class="btn ghost"><Icon name="download" :size="13" /> 导出报告</button>
      </div>
    </div>

    <!-- 三栏主体 -->
    <div class="bd-three-col">
      <div class="bd-left">
        <RuleOutlineList :results="results" :active-code="activeCode" @select="(c) => (activeCode = c)" />
      </div>
      <div class="bd-mid card glow">
        <RuleDetailArea :result="activeResult" @jump-to-viz="handleJumpToViz" />
      </div>
      <div class="bd-right">
        <BuildingInfoPanel :building="building" :nodes="nodes" />
      </div>
    </div>
  </div>

  <div v-else-if="!loading" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑清单']" />
    <div class="card glow" style="padding: 60px; text-align: center; color: var(--text-2)">
      未找到该建筑(ID: {{ route.params.id }})
    </div>
  </div>
</template>
