<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingListPage · 页面 4.1 建筑清单
   ═══════════════════════════════════════════════════════════════ */
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import QuickFilterBar from "../../components/result/QuickFilterBar.vue";
import LeftFilterPanel from "../../components/result/LeftFilterPanel.vue";
import BuildingCard from "../../components/result/BuildingCard.vue";
import { fetchBuildings } from "../../data/buildings-api.js";

import "../../assets/styles/building-list.css";

const router = useRouter();

const year = ref(2025);
const quick = ref("high"); // 默认高优先级复合
const sortKey = ref("hitCount");
const viewMode = ref("card"); // card / table(预留)
const search = ref("");
const filters = reactive({ funcs: [], hitMin: 0, hitMax: 10, archives: [] });

const buildings = ref([]);
const loading = ref(true);

onMounted(async () => {
  buildings.value = await fetchBuildings({ year: year.value });
  loading.value = false;
});

// ─── 计算各分类的建筑数量,用于快捷筛选按钮 ───
const counts = computed(() => {
  const all = buildings.value.length;
  return {
    high: buildings.value.filter((b) => b.hitCount >= 4).length,
    target: buildings.value.filter((b) => b.category === "目标调适").length,
    check: buildings.value.filter((b) => b.category === "待核查").length,
    normal: buildings.value.filter((b) => b.category === "正常").length,
    nodata: buildings.value.filter((b) => b.category === "无节点" || b.category === "无数据").length,
    all,
  };
});

// ─── 快捷筛选 + 左侧筛选 + 搜索,链式过滤 ───
const filtered = computed(() => {
  return buildings.value.filter((b) => {
    if (quick.value === "high" && !(b.hitCount >= 4)) return false;
    if (quick.value === "target" && b.category !== "目标调适") return false;
    if (quick.value === "check" && b.category !== "待核查") return false;
    if (quick.value === "normal" && b.category !== "正常") return false;
    if (quick.value === "nodata" && !(b.category === "无节点" || b.category === "无数据")) return false;

    if (filters.funcs.length > 0 && !filters.funcs.includes(b.buildFunc)) return false;
    if (b.hitCount < filters.hitMin || b.hitCount > filters.hitMax) return false;
    if (filters.archives.length > 0 && !filters.archives.includes(b.status)) return false;

    if (search.value) {
      const q = search.value.toLowerCase();
      if (!b.name.includes(search.value) && !b.buildId.toLowerCase().includes(q) && !b.buildFuncName.includes(search.value)) return false;
    }
    return true;
  });
});

// ─── 排序 ───
const sorted = computed(() => {
  const arr = [...filtered.value];
  if (sortKey.value === "hitCount") arr.sort((a, b) => b.hitCount - a.hitCount);
  else if (sortKey.value === "buildFunc") arr.sort((a, b) => a.buildFunc.localeCompare(b.buildFunc) || b.hitCount - a.hitCount);
  else if (sortKey.value === "buildId") arr.sort((a, b) => a.buildId.localeCompare(b.buildId));
  return arr;
});

const resetFilters = () => {
  filters.funcs = [];
  filters.hitMin = 0;
  filters.hitMax = 10;
  filters.archives = [];
};

const onOpenBuilding = (b) => {
  router.push(`/result/${b.buildId}`);
};
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定结果', '建筑清单']" />

    <div class="page-head">
      <div>
        <h1 class="page-title">
          <Icon name="target" :size="22" stroke="var(--brand)" />
          建筑清单
        </h1>
        <div class="page-subtitle">
          规则引擎判定结果的建筑维度聚合。共 <b>{{ counts.all }} 栋</b> 建筑参与本次分析,
          其中 <b :style="{ color: 'var(--hit-7plus)' }">{{ counts.high }} 栋</b>(命中≥4条,排除D01)为高优先级复合异常建筑。
          数据源 <code class="inline-code mono">T_ST_CxRuleResult</code>。
        </div>
      </div>
      <div class="page-head-actions">
        <div class="year-selector">
          <span class="year-label">分析年份</span>
          <select class="filter-select year-select mono" v-model.number="year">
            <option :value="2025">2025</option>
            <option :value="2024" disabled>2024 · 暂无数据</option>
          </select>
        </div>
        <button class="btn ghost"><Icon name="download" :size="14" /> 导出清单</button>
      </div>
    </div>

    <!-- 顶部快捷筛选按钮组 -->
    <QuickFilterBar :active="quick" :counts="counts" @update:active="(v) => (quick = v)" />

    <!-- 两栏布局:左筛选 + 右主体 -->
    <div class="bld-two-col">
      <div class="bld-left">
        <LeftFilterPanel v-model="filters" @reset="resetFilters" />
      </div>

      <div class="bld-right">
        <!-- 工具栏:搜索 + 排序 + 视图切换 -->
        <div class="bld-toolbar">
          <div class="bld-toolbar-left">
            <div class="search-wrap">
              <Icon name="search" :size="14" stroke="#97a4c0" />
              <input class="search-input" placeholder="搜索建筑名 / 编号 / 业态" v-model="search" />
              <button v-if="search" class="search-clear" @click="search = ''"><Icon name="x" :size="12" /></button>
            </div>
            <div class="bld-result-count mono">
              共 <b>{{ sorted.length }}</b> 栋 <span class="dim">/ {{ counts.all }}</span>
            </div>
          </div>
          <div class="bld-toolbar-right">
            <div class="sort-group">
              <span class="sort-label">排序</span>
              <select class="filter-select sort-select" v-model="sortKey">
                <option value="hitCount">命中数降序</option>
                <option value="buildFunc">业态编码</option>
                <option value="buildId">建筑ID</option>
              </select>
            </div>
            <div class="view-toggle">
              <button class="view-btn" :class="{ active: viewMode === 'card' }" title="卡片视图" @click="viewMode = 'card'">
                <Icon name="layers" :size="14" />
              </button>
              <button class="view-btn" :class="{ active: viewMode === 'table' }" title="表格视图(待第二批)" @click="viewMode = 'table'">
                <Icon name="list" :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- 主体:卡片列表 -->
        <div v-if="sorted.length === 0" class="bld-empty">
          <Icon name="search" :size="36" stroke="#c5cee0" />
          <div>没有匹配的建筑</div>
          <div class="empty-sub">尝试调整筛选条件或搜索关键词</div>
          <button class="btn ghost sm" @click="resetFilters"><Icon name="x" :size="12" /> 重置筛选</button>
        </div>
        <div v-else-if="viewMode === 'card'" class="bld-grid">
          <BuildingCard v-for="b in sorted" :key="b.buildId" :building="b" @click="onOpenBuilding(b)" />
        </div>
        <div v-else class="bld-empty">
          <Icon name="list" :size="36" stroke="#c5cee0" />
          <div>表格视图待第二批实现</div>
          <button class="btn ghost sm" @click="viewMode = 'card'"><Icon name="layers" :size="12" /> 切回卡片视图</button>
        </div>

        <!-- 底部提示 -->
        <div v-if="sorted.length > 0" class="bld-list-foot">
          <div class="footer-hint">
            <Icon name="info" :size="12" stroke="#6a7da3" />
            <span>点击卡片将进入 <b>建筑详情页(4.3)</b>,查看每条命中规则的判定详情与调适建议</span>
          </div>
          <div class="footer-meta mono">
            数据源:<code class="inline-code">T_ST_CxRuleResult</code> · 分析年份 {{ year }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
