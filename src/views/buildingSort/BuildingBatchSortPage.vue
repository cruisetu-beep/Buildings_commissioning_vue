<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingBatchSortPage · 待调试楼宇批次判断与推荐页面
   依据：
   1. 命中的待调试规则数量 (降序：规则多优先)
   2. 楼宇的淘汰设备数量 (降序：设备多优先)
   3. 楼宇碳效码评分 (升序：得分/等级低优先)
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import SortPriorityBar from "../../components/buildingSort/SortPriorityBar.vue";
import { getBuildingCommissioningSort, getBuildingFuncOptions } from "../../api/buildingSort.js";

const router = useRouter();

// 规则优先级配置：默认 ['hitRules', 'eliminatedDevices', 'carbonScore']
const sortPriority = ref(["hitRules", "eliminatedDevices", "carbonScore"]);
const selectedFunc = ref("");
const funcOptions = ref([]);
const recommendLimit = ref(10);

const tableData = ref([]);
const rawTotalCount = ref(0);
const loading = ref(false);
const exporting = ref(false);

const displayedData = computed(() => tableData.value);

// 加载待调试楼宇排序列表
async function fetchSortedData() {
  loading.value = true;
  try {
    const res = await getBuildingCommissioningSort({
      buildFunc: selectedFunc.value,
      limitCount: recommendLimit.value || 10,
      sortPriority: sortPriority.value
    });
    tableData.value = res.items || [];
    rawTotalCount.value = res.totalCount || tableData.value.length;
  } catch (error) {
    console.error("获取待调试楼宇排序推荐失败:", error);
  } finally {
    loading.value = false;
  }
}

// 跳转至楼宇调试详情页
function handleViewDetail(row) {
  if (row.buildId) {
    router.push(`/result/${row.buildId}`);
  }
}

// 导出 CSV / Excel 文件
function handleExport() {
  if (!displayedData.value || displayedData.value.length === 0) {
    alert("当前暂无可导出的推荐楼宇数据，请先点击“推荐待调试楼宇”按钮计算数据。");
    return;
  }

  exporting.value = true;
  try {
    const headers = [
      "推荐排名",
      "楼宇编码",
      "楼宇名称",
      "建筑业态",
      "命中规则数",
      "淘汰设备数",
      "碳效码评分",
      "碳效等级",
      "判定依据与建议",
      "最近评估日期"
    ];

    const rows = displayedData.value.map((item) => [
      item.rank,
      item.buildId,
      `"${(item.buildName || "").replace(/"/g, '""')}"`,
      `"${(item.buildFuncName || item.buildFunc || "").replace(/"/g, '""')}"`,
      item.hitRulesCount,
      item.eliminatedDevicesCount,
      item.carbonScore,
      item.carbonCode,
      `"${(item.judgmentCriteria || "").replace(/"/g, '""')}"`,
      item.lastEvaluationDate || ""
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fileNameDate = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `待调试楼宇推荐处置建议_${fileNameDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    alert("导出失败: " + (error.message || "未知错误"));
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  funcOptions.value = await getBuildingFuncOptions();
});
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '待调试楼宇判断', '批次推荐列表']" />

    <!-- 头部说明卡片 -->
    <div class="page-card head-card">
      <div class="head-left">
        <div class="head-icon">
          <Icon name="building" :size="24" stroke="var(--brand, #2f7fff)" />
        </div>
        <div>
          <h1 class="page-title">待调试楼宇批次判断与推荐优先级建议</h1>
          <p class="page-subtitle">
            系统针对当前已纳管的楼宇，依据**命中的待调试规则数量**、**楼宇淘汰设备数量**及**楼宇碳效码评分**三大指标进行加权动态排序，为您制定优先调适楼宇计划提供精准决策支持。
          </p>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn primary" @click="handleExport" :disabled="exporting">
          <Icon name="download" :size="14" />
          {{ exporting ? '导出中...' : '导出推荐建议 Excel' }}
        </button>
      </div>
    </div>

    <!-- 规则优先级配置条 (仅更新配置数据，点击推荐按钮时统一计算) -->
    <SortPriorityBar v-model="sortPriority" />

    <!-- 工具栏与筛选区 -->
    <div class="page-card table-card">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">
            <Icon name="list" :size="16" stroke="var(--brand, #2f7fff)" />
            待调试楼宇推荐优先级列表
          </span>
          <span class="count-badge">
            共匹配到 {{ rawTotalCount }} 栋待调适楼宇
          </span>
        </div>

        <div class="toolbar-right">
          <!-- 建筑业态筛选 -->
          <div class="filter-item">
            <span class="filter-label">建筑业态：</span>
            <select class="filter-select" v-model="selectedFunc">
              <option v-for="opt in funcOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- 推荐楼宇数量控制 -->
          <div class="filter-item">
            <span class="filter-label">推荐数量：</span>
            <input
              type="number"
              class="filter-input-num mono"
              v-model.number="recommendLimit"
              min="1"
              max="100"
              placeholder="推荐数"
            />
            <span class="unit-label">栋</span>
          </div>

          <!-- 推荐计算按钮 -->
          <button class="btn brand-btn" :disabled="loading" @click="fetchSortedData">
            <Icon name="sparkles" :size="14" />
            {{ loading ? '计算中...' : '推荐待调试楼宇' }}
          </button>
        </div>
      </div>

      <!-- 推荐数据表格列表 -->
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr>
              <th width="85" style="text-align: center;">推荐排名</th>
              <th width="140">楼宇编码</th>
              <th min-width="180">楼宇名称</th>
              <th width="120">建筑业态</th>
              <th width="120" style="text-align: right;">命中规则数</th>
              <th width="120" style="text-align: right;">淘汰设备数</th>
              <th width="120" style="text-align: center;">碳效码评分</th>
              <th min-width="240">判定依据与调适建议</th>
              <th width="100" style="text-align: center;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="loading-td">
                <div class="loading-box">
                  <Icon name="sparkles" :size="20" stroke="var(--brand)" />
                  <span>正在动态分析计算待调试楼宇权重排序...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="displayedData.length === 0">
              <td colspan="9" class="empty-td">
                <div class="empty-box">
                  <Icon name="search" :size="32" stroke="#cbd5e1" />
                  <span>未找到匹配条件的楼宇数据</span>
                </div>
              </td>
            </tr>
            <tr v-for="row in displayedData" :key="row.buildId" class="table-row">
              <!-- 1. 推荐排名徽章 -->
              <td style="text-align: center;">
                <div class="rank-badge-wrap">
                  <span v-if="row.rank === 1" class="medal gold" title="第一优先级">1</span>
                  <span v-else-if="row.rank === 2" class="medal silver" title="第二优先级">2</span>
                  <span v-else-if="row.rank === 3" class="medal bronze" title="第三优先级">3</span>
                  <span v-else class="rank-num mono">{{ row.rank }}</span>
                </div>
              </td>

              <!-- 2. 楼宇编码 -->
              <td>
                <span class="mono-code">{{ row.buildId }}</span>
              </td>

              <!-- 3. 楼宇名称 -->
              <td>
                <span class="bld-name">{{ row.buildName }}</span>
              </td>

              <!-- 4. 建筑业态 -->
              <td>
                <span class="func-tag">{{ row.buildFuncName || row.buildFunc }}</span>
              </td>

              <!-- 5. 命中规则数 -->
              <td style="text-align: right;">
                <span class="metric-val rules-val">{{ row.hitRulesCount }} 条</span>
              </td>

              <!-- 6. 淘汰设备数 -->
              <td style="text-align: right;">
                <span class="metric-val dev-val">{{ row.eliminatedDevicesCount }} 台</span>
              </td>

              <!-- 7. 碳效码评分 -->
              <td style="text-align: center;">
                <div class="carbon-score-box">
                  <span class="carbon-score mono">{{ row.carbonScore }}分</span>
                  <span class="carbon-code-tag" :class="`code-${row.carbonCode}`">{{ row.carbonCode }}级</span>
                </div>
              </td>

              <!-- 8. 判定依据 -->
              <td>
                <span class="criteria-text">{{ row.judgmentCriteria }}</span>
              </td>

              <!-- 9. 操作跳转 -->
              <td style="text-align: center;">
                <button class="btn-link" @click="handleViewDetail(row)">
                  调试详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  box-sizing: border-box;
}

.page-card {
  background: #ffffff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.head-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.head-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f0ff, #d8e4fb);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-0, #0f172a);
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-2, #64748b);
  margin: 4px 0 0 0;
  line-height: 1.5;
}

.table-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-0, #0f172a);
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-badge {
  font-size: 12px;
  background: rgba(47, 127, 255, 0.1);
  color: #2f7fff;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-1, #475569);
  white-space: nowrap;
}

.filter-select {
  padding: 5px 10px;
  border: 1px solid var(--line-strong, #cbd5e1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-0, #0f172a);
  background: #ffffff;
  outline: none;
}

.filter-select:focus {
  border-color: var(--brand, #2f7fff);
}

.filter-input-num {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--line-strong, #cbd5e1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-0, #0f172a);
  outline: none;
  text-align: center;
}

.filter-input-num:focus {
  border-color: var(--brand, #2f7fff);
}

.unit-label {
  font-size: 12px;
  color: var(--text-2, #64748b);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn.primary {
  background: #ffffff;
  border-color: var(--line-strong, #cbd5e1);
  color: var(--text-0, #0f172a);
}

.btn.primary:hover {
  background: #f8fafc;
  border-color: var(--brand, #2f7fff);
  color: var(--brand, #2f7fff);
}

.btn.brand-btn {
  background: linear-gradient(135deg, #2f7fff, #1a62d6);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(47, 127, 255, 0.25);
}

.btn.brand-btn:hover {
  opacity: 0.92;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ──────── 表格样式 ──────── */
.table-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.custom-table th {
  background: #f8fafc;
  color: var(--text-1, #475569);
  font-weight: 600;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line, #e2e8f0);
}

.custom-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-0, #0f172a);
}

.table-row:hover {
  background: #f8faff;
}

/* 排名勋章 */
.rank-badge-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.medal {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: bold;
  font-size: 13px;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.medal.gold {
  background: linear-gradient(135deg, #ffc837, #ff8008);
}

.medal.silver {
  background: linear-gradient(135deg, #a8c0ff, #3f2b96);
}

.medal.bronze {
  background: linear-gradient(135deg, #e55d87, #5fc3e4);
}

.rank-num {
  font-weight: 600;
  color: #64748b;
}

.mono-code {
  font-family: "JetBrains Mono", monospace;
  color: var(--brand, #2f7fff);
  font-weight: 500;
}

.bld-name {
  font-weight: 600;
  color: #0f172a;
}

.func-tag {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.metric-val {
  font-family: "JetBrains Mono", monospace;
  font-weight: 600;
}

.rules-val {
  color: #ef4444;
}

.dev-val {
  color: #f59e0b;
}

.carbon-score-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.carbon-score {
  font-weight: 700;
  color: #0f172a;
}

.carbon-code-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  color: #ffffff;
}

.code-A { background: #10b981; }
.code-B { background: #3b82f6; }
.code-C { background: #f59e0b; }
.code-D { background: #f97316; }
.code-E { background: #ef4444; }

.criteria-text {
  font-size: 12px;
  color: var(--text-1, #475569);
  line-height: 1.4;
}

.btn-link {
  background: none;
  border: none;
  color: var(--brand, #2f7fff);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.btn-link:hover {
  text-decoration: underline;
  background: rgba(47, 127, 255, 0.08);
}

.loading-td, .empty-td {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.loading-box, .empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
</style>
