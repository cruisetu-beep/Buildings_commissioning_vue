<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingImportModal · 录入建筑判定向导模态框（假落库演示交互版）
   ═══════════════════════════════════════════════════════════════ */
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import Icon from "../icons/Icon.vue";
import { fetchCalcBuildings, fetchBuildingResources, fetchBuildingCalcSteps, saveBuildingCxResult } from "../../data/buildings-api.js";
import { fetchRules } from "../../data/rules-api.js";
import "../../assets/styles/import-modal.css";

const props = defineProps({
  show: { type: Boolean, required: true }
});

const emit = defineEmits(["close", "saved"]);

// ─── 状态管理 ───
const step = ref(1);
const loading = ref(false);
const buildingList = ref([]);
const selectedBuildId = ref("");
const selectedBuilding = ref(null); // 第一步中选中的建筑原始对象（包含真实命中的规则）
const buildingInfo = ref(null);    // 接口返回的建筑基础信息及附件
const ruleMetas = ref([]);         // 接口返回的 34 条规则元数据
const calcSteps = ref([]);         // 接口返回的 34 条规则真实计算流水步骤

// ─── 可搜索下拉菜单状态及逻辑 ───
const showDropdown = ref(false);
const searchTerm = ref("");

const filteredBuildings = computed(() => {
  if (!searchTerm.value) {
    return buildingList.value;
  }
  const term = searchTerm.value.toLowerCase();
  return buildingList.value.filter(
    (b) =>
      b.buildId.toLowerCase().includes(term) ||
      b.name.toLowerCase().includes(term)
  );
});

function selectBuildingOption(b) {
  selectedBuildId.value = b.buildId;
  showDropdown.value = false;
  searchTerm.value = "";
  onBuildingChange();
}

function getSelectedBuildName() {
  const b = buildingList.value.find((x) => x.buildId === selectedBuildId.value);
  return b ? `[${b.buildId}] ${b.name}` : "";
}

function handleOutsideClick(e) {
  const selectEl = document.querySelector(".select-search-container");
  if (selectEl && !selectEl.contains(e.target)) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  window.addEventListener("click", handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener("click", handleOutsideClick);
});

// 步骤 2 计算动画状态
const progress = ref(0);
const logs = ref([]);
const realtimeHits = ref([]);
const timer = ref(null);
const logContainerRef = ref(null);
const displayRules = ref([]);
const finishedRules = ref([]);
const activePanels = ref({});

const dynamicCategories = computed(() => {
  const cats = [];
  finishedRules.value.forEach(r => {
    if (r.category && !cats.includes(r.category)) {
      cats.push(r.category);
    }
  });

  const priorityOrder = ["目标调适", "待核查", "正常", "无节点", "无数据"];
  cats.sort((a, b) => {
    let ia = priorityOrder.indexOf(a);
    let ib = priorityOrder.indexOf(b);
    if (ia === -1) ia = 99;
    if (ib === -1) ib = 99;
    return ia - ib;
  });

  return cats;
});

function getCategoryStyle(cat) {
  if (cat === "目标调适") {
    return { bg: "#fff1f2", color: "#e11d48", border: "#ffe4e6", dot: "#e11d48" };
  } else if (cat === "待核查") {
    return { bg: "#e0f2fe", color: "#0284c7", border: "#bae6fd", dot: "#0284c7" };
  } else if (cat === "正常") {
    return { bg: "#f0fdf4", color: "#16a34a", border: "#dcfce7", dot: "#16a34a" };
  } else {
    // 除了目标调适，待核查，正常，其他所有分类统一使用和“无节点”完全相同的灰色配比
    return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", dot: "#64748b" };
  }
}

function getRuleSeries(ruleCode) {
  if (!ruleCode) return "C";
  const code = ruleCode.trim().toUpperCase();
  if (code.startsWith("C")) return "C";
  if (code.startsWith("D")) return "D";
  return "S";
}

// ─── 初始化数据 ───
onMounted(async () => {
  if (props.show) {
    await initData();
  }
});

watch(() => props.show, async (newVal) => {
  if (newVal) {
    resetState();
    await initData();
  }
});

async function initData() {
  loading.value = true;
  try {
    const list = await fetchCalcBuildings();
    buildingList.value = list || [];
    ruleMetas.value = await fetchRules();
  } catch (err) {
    console.error("Failed to load initial data for import modal:", err);
  } finally {
    loading.value = false;
  }
}

// ─── 自定义 Toast 提示 ───
const toastMsg = ref("");
const toastType = ref("info"); // 'info' | 'error' | 'success'
const toastVisible = ref(false);
let toastTimer = null;

function showToast(msg, type = "info") {
  toastMsg.value = msg;
  toastType.value = type;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function resetState() {
  step.value = 1;
  selectedBuildId.value = "";
  selectedBuilding.value = null;
  buildingInfo.value = null;
  calcSteps.value = [];
  progress.value = 0;
  logs.value = [];
  realtimeHits.value = [];
  finishedRules.value = [];
  activePanels.value = {};
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
}

// ─── 建筑选择联动 ───
async function onBuildingChange() {
  if (!selectedBuildId.value) {
    buildingInfo.value = null;
    selectedBuilding.value = null;
    return;
  }

  // 记录选中的原始建筑对象，供第 2 步模拟命中规则使用
  selectedBuilding.value = buildingList.value.find(b => b.buildId === selectedBuildId.value) || null;
  
  // 切换大楼时，彻底清理上一次的日志、进度与判定结果，防止脏数据残留
  logs.value = [];
  progress.value = 0;
  finishedRules.value = [];
  realtimeHits.value = [];

  loading.value = true;
  try {
    const data = await fetchBuildingResources(selectedBuildId.value);
    buildingInfo.value = data;
  } catch (err) {
    console.error("fetchBuildingResources failed:", err);
  } finally {
    loading.value = false;
  }
}

// ─── 真实附件下载 ───
function downloadAttachment(file) {
  if (file.objectName && file.bucketName) {
    const url = getFileUrl(file.bucketName, file.objectName);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    showToast("无法下载文件：缺少对象路径", "error");
  }
}

// ─── 附件预览 ───
function previewAttachment(file) {
  if (file.objectName && file.bucketName) {
    const url = getFileUrl(file.bucketName, file.objectName);
    window.open(url, "_blank");
  } else {
    showToast("无法预览文件：缺少对象路径", "error");
  }
}

// ─── 统一获取 OOS 文件访问真实 URL (对齐台账环境配置与降级备用地址) ───
function getFileUrl(bucketName, objectName) {
  if (!bucketName || !objectName) return "";
  const baseUrl = import.meta.env.VITE_CARBON_PLATFORM_API_BASE;
  const normalizedBaseUrl = baseUrl ? (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") : "/";
  return `${normalizedBaseUrl}api/public/oosFile?bucketName=${encodeURIComponent(bucketName)}&objectName=${encodeURIComponent(objectName)}`;
}

// ─── 动画计算流水线 (Step 2) ───
function runCalculation() {
  logs.value = [];
  realtimeHits.value = [];
  finishedRules.value = [];
  progress.value = 0;

  addLog("info", `[INFO] ${new Date().toLocaleTimeString()} ────── 启动规则引擎计算 ──────`);
  addLog("info", `[INFO] 目标建筑：${buildingInfo.value?.buildName || '未知建筑'} (${selectedBuildId.value})`);
  addLog("info", `[INFO] 关联案例：${buildingInfo.value?.caseTitle || '—'} | 地址：${buildingInfo.value?.address || '—'}`);
  addLog("info", `[INFO] 正在载入规则校验步骤流水，获取计量节点与数据输出...`);

  // 载入真实计算流水规则列表
  displayRules.value = calcSteps.value || [];

  let currentIndex = 0;
  const totalRules = displayRules.value.length;

  timer.value = setInterval(() => {
    if (currentIndex >= totalRules) {
      clearInterval(timer.value);
      timer.value = null;
      progress.value = 100;
      addLog("success", `[SUCCESS] ${new Date().toLocaleTimeString()} ────── 规则计算执行完成 ──────`);
      return;
    }

    const rule = displayRules.value[currentIndex];
    
    // 1. 打印校验的规则名称
    addLog("info", `[RUNNING] 正在检验规则 (${rule.ruleCode}): ${rule.ruleName}`);

    // 2. 遍历打印其下的 3 个计算步骤 (F_StepName, InputJSON, OutputJSON)
    if (rule.steps && rule.steps.length > 0) {
      rule.steps.forEach(s => {
        const stepName = s.stepName || s.StepName || "";
        const inputJson = s.inputJson || s.InputJson || "null";
        const outputJson = s.outputJson || s.OutputJson || "null";
        const status = s.status || s.Status || "SUCCESS";

        // 打印输入 JSON
        addLog("info", `     -> [${stepName}] 输入: ${inputJson}`);
        // 打印输出 JSON 
        addLog("info", `     -> [${stepName}] 输出: ${outputJson}`);
        // 打印状态结果
        addLog("info", `     -> [${stepName}] 状态: ${status}`);
      });
    }

    // 3. 根据 F_Category 打印最后的结果诊断
    if (rule.category === null || rule.category === undefined || rule.category === '') {
      addLog("success", `   => [SKIPPED] 无数据。本次计算忽略。`);
    } else {
      const isWarn = rule.category === "目标调适" || rule.category === "待核查";
      addLog(isWarn ? "warn" : "success", `   => [步骤状态] 判定完成。结论：${rule.category} (摘要: ${rule.summary || ''})`);
      realtimeHits.value.push(rule);
    }

    finishedRules.value.push(rule);
    currentIndex++;
    progress.value = Math.min(99, Math.round((currentIndex / totalRules) * 100));
  }, 220);
}

function addLog(type, text) {
  logs.value.push({ type, text });
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
    }
  });
}

// ─── 步骤跳转 ───
async function handleNext() {
  if (step.value === 1) {
    // 点击开始分析，立即重置上一次分析状态，防止在过渡动画和加载期间出现旧建筑的日志和进度条残留
    finishedRules.value = [];
    realtimeHits.value = [];
    logs.value = [];
    progress.value = 0;
    loading.value = true;
    try {
      calcSteps.value = await fetchBuildingCalcSteps(selectedBuildId.value, 2025);
    } catch (err) {
      console.error("fetchBuildingCalcSteps failed:", err);
    } finally {
      loading.value = false;
    }
    step.value = 2;
    // 进入第 2 步后，延迟启动计算流水线
    setTimeout(() => {
      runCalculation();
    }, 400);
  } else if (step.value === 2) {
    step.value = 3;
  }
}

function handlePrev() {
  if (step.value === 2) {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
    step.value = 1;
    // 回到上一步时，同步清理计算日志、进度以及临时计算数据，确保下次分析时界面干净
    logs.value = [];
    progress.value = 0;
    finishedRules.value = [];
    realtimeHits.value = [];
  } else if (step.value === 3) {
    step.value = 2;
  }
}

// ─── 真实保存（状态置1落库） ───
async function onSave() {
  if (loading.value || !selectedBuildId.value) return;
  loading.value = true;
  try {
    const success = await saveBuildingCxResult(selectedBuildId.value);
    if (success) {
      showToast("保存成功！", "success");
      emit("saved");
      setTimeout(() => {
        onClose();
      }, 1000);
      // 成功时不恢复 loading，让其一直保持 true 直至弹窗销毁，彻底防连击
    } else {
      showToast("保存失败：未找到记录或服务异常", "error");
      loading.value = false;
    }
  } catch (error) {
    console.error(error);
    showToast("保存出错，请稍后重试", "error");
    loading.value = false;
  }
}

function onClose() {
  resetState();
  emit("close");
}
</script>

<template>
  <div v-if="show" class="import-modal-overlay" @click.self="onClose">
    <!-- 全局高档 Toast 提示 -->
    <transition name="toast-fade">
      <div v-show="toastVisible" class="custom-toast" :class="toastType">
        <Icon v-if="toastType === 'success'" name="check" :size="14" />
        <Icon v-else-if="toastType === 'error'" name="alert" :size="14" />
        <Icon v-else name="info" :size="14" />
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <div class="import-modal-container">
      
      <!-- 头部 -->
      <div class="import-modal-header">
        <div class="import-modal-title">
          <Icon name="plus" :size="16" stroke="var(--brand)" />
          <span>录入建筑</span>
        </div>
        <button class="import-modal-close" @click="onClose">
          <Icon name="x" :size="16" />
        </button>
      </div>

      <!-- 步骤条 -->
      <div class="import-modal-steps">
        <div class="import-step-item" :class="{ active: step === 1, completed: step > 1 }">
          <span class="import-step-dot">1</span>
          <span class="import-step-text">基础信息与附件</span>
        </div>
        <div class="import-step-line" />
        <div class="import-step-item" :class="{ active: step === 2, completed: step > 2 }">
          <span class="import-step-dot">2</span>
          <span class="import-step-text">规则引擎计算</span>
        </div>
        <div class="import-step-line" />
        <div class="import-step-item" :class="{ active: step === 3 }">
          <span class="import-step-dot">3</span>
          <span class="import-step-text">判定结果展示</span>
        </div>
      </div>

      <!-- 步骤主体 -->
      <div class="import-modal-body" style="position: relative;">
        <!-- 自定义加载遮罩层，防未安装 element-plus 造成的指令警告及编译报错 -->
        <div v-if="loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.75); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; border-radius: 8px;">
          <div class="loading-spin" style="width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: var(--brand); border-radius: 50%; animation: custom-spin 0.8s linear infinite;"></div>
          <span style="margin-top: 10px; font-size: 13px; color: #64748b;">数据加载中...</span>
        </div>
        
        <!-- STEP 1: 录入建筑及附件展示 -->
        <div v-if="step === 1" class="step-info-layout" style="height: auto;">
          <div class="info-card">
            <div class="info-section-title">
              <Icon name="sliders" :size="14" stroke="var(--brand)" />
              <span>基础信息录入</span>
            </div>
            
            <div class="import-form-grid">
              <div class="form-field select-search-container" style="position: relative;">
                <label>选择建筑 <span>*</span></label>
                <div class="custom-select-trigger" @click="showDropdown = !showDropdown">
                  <span>{{ getSelectedBuildName() || '请选择或搜索建筑...' }}</span>
                  <Icon name="chevron-d" :size="12" style="margin-left: auto;" />
                </div>
                <div v-show="showDropdown" class="custom-select-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); margin-top: 4px; padding: 8px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="position: relative; display: flex; align-items: center;">
                    <input class="import-input" style="padding-left: 32px; font-size: 13px;" type="text" v-model="searchTerm" placeholder="输入名称或编号搜索..." @click.stop />
                    <Icon name="search" :size="13" style="position: absolute; left: 10px; color: #94a3b8;" />
                  </div>
                  <ul style="list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
                    <li v-for="b in filteredBuildings" :key="b.buildId" @click="selectBuildingOption(b)" style="padding: 8px 10px; font-size: 13px; color: #334155; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; transition: background 0.15s;" :class="{ active: selectedBuildId === b.buildId }" class="dropdown-item">
                      <span>[{{ b.buildId }}] {{ b.name }}</span>
                    </li>
                    <li v-if="filteredBuildings.length === 0" style="padding: 12px; text-align: center; font-size: 13px; color: #94a3b8;">
                      未找到匹配的大楼
                    </li>
                  </ul>
                </div>
              </div>

              <div class="form-field">
                <label>建筑编号</label>
                <input class="import-input" type="text" :value="buildingInfo?.buildId || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>街道</label>
                <input class="import-input" type="text" :value="buildingInfo?.street || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>地址</label>
                <input class="import-input" type="text" :value="buildingInfo?.address || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>经度 (Longitude)</label>
                <input class="import-input" type="text" :value="buildingInfo?.longitude || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>纬度 (Latitude)</label>
                <input class="import-input" type="text" :value="buildingInfo?.latitude || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>案例编号</label>
                <input class="import-input" type="text" :value="buildingInfo?.caseId || '自动关联填入'" readonly />
              </div>

              <div class="form-field">
                <label>案例名称</label>
                <input class="import-input" type="text" :value="buildingInfo?.caseTitle || '自动关联填入'" readonly />
              </div>

              <div class="form-field" style="grid-column: span 2;">
                <label>案例图片</label>
                <div v-if="buildingInfo?.objectName" class="case-img-preview" style="margin-top: 8px;">
                  <img :src="getFileUrl('exhibition-case', buildingInfo.objectName)" alt="案例图片" style="max-width: 240px; max-height: 160px; border-radius: 4px; border: 1px solid #e2e8f0; object-fit: cover;" />
                </div>
                <input v-else class="import-input" type="text" value="暂无案例图片" readonly />
              </div>

              <div class="form-field" style="grid-column: span 2;">
                <label>案例简介</label>
                <textarea class="import-input" style="height: 80px; resize: vertical; padding: 8px; font-family: inherit; font-size: inherit;" :value="buildingInfo?.introduce || '自动关联填入'" readonly></textarea>
              </div>
            </div>
          </div>

          <!-- 附件与图纸区 -->
          <div class="info-card">
            <div class="info-section-title">
              <Icon name="download" :size="14" stroke="var(--brand)" />
              <span>资源包附件</span>
            </div>

            <div v-if="!buildingInfo" class="rules-chips-empty" style="text-align: center; padding: 40px 0;">
              选择建筑后自动查询资源包中的附件信息
            </div>
            <div v-else class="attachments-grid">
              <div v-for="file in buildingInfo.attachments" :key="file.name" class="attachment-card">
                <div class="attachment-icon" :class="file.type">
                  <Icon v-if="file.type === 'pdf'" name="file-text" :size="18" />
                  <Icon v-else-if="file.type === 'xlsx'" name="list" :size="18" />
                  <Icon v-else-if="file.type === 'docx'" name="sliders" :size="18" />
                  <Icon v-else name="sliders" :size="18" />
                </div>
                <div class="attachment-info">
                  <div class="attachment-name" :title="file.name">{{ file.name }}</div>
                  <div class="attachment-meta">文件大小：{{ file.size }} | 更新时间：{{ file.updateTime }}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="attachment-action" title="在线预览" @click="previewAttachment(file)">
                    <Icon name="eye" :size="12" />
                  </button>
                  <button class="attachment-action" title="下载附件" @click="downloadAttachment(file)">
                    <Icon name="download" :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 2: 判定流水线计算日志 -->
        <div v-if="step === 2" class="pipeline-layout">
          <div class="pipeline-sidebar">
            <div class="pipeline-side-card">
              <div class="side-card-title">建筑信息</div>
              <div class="side-bld-icon" style="overflow: hidden;">
                <img v-if="buildingInfo?.objectName" :src="getFileUrl('exhibition-case', buildingInfo.objectName)" alt="大楼" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit;" />
                <Icon v-else name="target" :size="20" style="margin: auto;" />
              </div>
              <div class="side-bld-name">{{ buildingInfo?.buildName }}</div>
              <div class="side-bld-code">{{ buildingInfo?.buildId }}</div>
              <div class="side-field"><span class="side-field-lbl">街道</span><span class="side-field-val">{{ buildingInfo?.street }}</span></div>
              <div class="side-field"><span class="side-field-lbl">地址</span><span class="side-field-val">{{ buildingInfo?.address }}</span></div>
              <div class="side-field"><span class="side-field-lbl">案例编号</span><span class="side-field-val">{{ buildingInfo?.caseId }}</span></div>
            </div>
          </div>
          <div class="pipeline-terminal-container">
            <div class="terminal-title-bar"><div class="terminal-dot-group"><span class="terminal-dot r" /><span class="terminal-dot y" /><span class="terminal-dot g" /></div></div>
            <div class="terminal-logs" ref="logContainerRef">
              <div v-for="(log, idx) in logs" :key="idx" class="log-line" :class="log.type">{{ log.text }}</div>
            </div>
          </div>
          <div class="pipeline-status-panel" style="width: 100%; min-width: 0; display: flex; flex-direction: column; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <div class="info-section-title" style="margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <Icon name="list" :size="13" stroke="var(--brand)" />
              <span style="font-size: 12px; font-weight: 600;">规则实时计算汇总 ({{ displayRules.length }}条)</span>
            </div>
            <div class="result-accordion" style="display: flex; flex-direction: column; gap: 8px; flex: 1; padding-bottom: 24px;">
              <div v-for="cat in dynamicCategories" :key="cat" class="accordion-item" style="border: 1px solid #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
                <div class="accordion-header" @click="activePanels[cat] = !activePanels[cat]" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #fafafa; cursor: pointer; user-select: none;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 8px; color: #94a3b8; transition: transform 0.2s; display: inline-block;" :style="{ transform: activePanels[cat] ? 'rotate(90deg)' : 'rotate(0deg)' }">▶</span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;" :style="{ background: getCategoryStyle(cat).bg, color: getCategoryStyle(cat).color, border: '1px solid ' + getCategoryStyle(cat).border }">
                      <span style="width: 4px; height: 4px; border-radius: 50%;" :style="{ background: getCategoryStyle(cat).dot }"></span>{{ cat }}
                    </span>
                  </div>
                  <span style="background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600; min-width: 16px; height: 14px; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; border-radius: 6px;">{{ finishedRules.filter(r => r.category === cat).length }}</span>
                </div>
                <div v-show="activePanels[cat]" class="accordion-content" style="background: #fff; padding: 4px 0;">
                  <div v-for="r in finishedRules.filter(r => r.category === cat)" :key="r.ruleCode" style="display: flex; align-items: center; gap: 6px; padding: 6px 10px 6px 20px; background: #fbfcfe; border-bottom: 1px solid #f8fafc;">
                    <span class="mono" :class="`series-${getRuleSeries(r.ruleCode)}`" style="font-size: 10px; padding: 1px 4px; border-radius: 2px; font-weight: 600;">{{ r.ruleCode }}</span>
                    <span style="font-size: 11.5px; color: #475569;">{{ r.ruleName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: 诊断结果 -->
        <div v-if="step === 3" class="result-showcase-layout">
          <div class="verdict-hero-card" :class="realtimeHits.some(h => h.category === '目标调适' || h.category === '待核查') ? 'target' : 'normal'">
            <div class="hero-left">
              <div class="hero-icon-box" :class="realtimeHits.some(h => h.category === '目标调适' || h.category === '待核查') ? 'target' : 'normal'">
                <Icon name="target" :size="22" stroke="currentColor" />
              </div>
              <div>
                <div class="hero-title">待调适楼宇分析报告判定完毕</div>
                <div class="hero-desc">该建筑判定的 {{ displayRules.length }} 条规则引擎已成功跑完。</div>
              </div>
            </div>
            <div class="hero-badge-wrap">
              <div class="hero-verdict-tag" :class="realtimeHits.some(h => h.category === '目标调适' || h.category === '待核查') ? 'target' : 'normal'">
                {{ realtimeHits.some(h => h.category === '目标调适' || h.category === '待核查') ? '目标调适' : '正常' }}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">共命中规则：{{ realtimeHits.length }} 条</div>
            </div>
          </div>
          <div class="info-card" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <div class="info-section-title" style="margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <Icon name="list" :size="14" stroke="var(--brand)" />
              <span>全部规则汇总 ({{ displayRules.length }}条)</span>
            </div>
            <div class="result-accordion" style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 24px;">
              <div v-for="cat in dynamicCategories" :key="cat" class="accordion-item" style="border: 1px solid #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
                <div class="accordion-header" @click="activePanels[cat] = !activePanels[cat]" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fafafa; cursor: pointer; user-select: none;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 9px; color: #94a3b8; transition: transform 0.2s; display: inline-block;" :style="{ transform: activePanels[cat] ? 'rotate(90deg)' : 'rotate(0deg)' }">▶</span>
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;" :style="{ background: getCategoryStyle(cat).bg, color: getCategoryStyle(cat).color, border: '1px solid ' + getCategoryStyle(cat).border }">
                      <span style="width: 5px; height: 5px; border-radius: 50%;" :style="{ background: getCategoryStyle(cat).dot }"></span>{{ cat }}
                    </span>
                  </div>
                  <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; min-width: 20px; height: 16px; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; border-radius: 8px;">{{ finishedRules.filter(r => r.category === cat).length }}</span>
                </div>
                <div v-show="activePanels[cat]" class="accordion-content" style="background: #fff; padding: 4px 0;">
                  <div v-for="r in finishedRules.filter(r => r.category === cat)" :key="r.ruleCode" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 30px; background: #fbfcfe; border-bottom: 1px solid #f8fafc;">
                    <span class="mono" :class="`series-${getRuleSeries(r.ruleCode)}`" style="font-size: 11px; padding: 2px 5px; border-radius: 3px; font-weight: 600;">{{ r.ruleCode }}</span>
                    <span style="font-size: 12px; color: #475569;">{{ r.ruleName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 进度条区域（仅在步骤 2 呈现） -->
      <div v-if="step === 2" class="pipeline-progress-wrap">
        <span style="font-size: 12.5px; font-weight: 600; color: #475569;">规则校验进度：</span>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }" />
        </div>
        <span class="progress-percent-lbl">{{ progress }}%</span>
      </div>

      <!-- 模态框底部操作栏 -->
      <div class="import-modal-footer">
        <button class="btn" v-if="step > 1" @click="handlePrev">
          上一步
        </button>
        <button class="btn primary" v-if="step === 1" :disabled="!selectedBuildId" @click="handleNext">
          开始分析
        </button>
        <button class="btn primary" v-if="step === 2" :disabled="progress < 100" @click="handleNext">
          查看判定结果
        </button>
        <button class="btn primary" v-if="step === 3" :disabled="loading" @click="onSave">
          <span v-if="loading">保存中...</span>
          <span v-else>保存</span>
        </button>
        <button class="btn ghost" @click="onClose">
          取消
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes custom-spin {
  to {
    transform: rotate(360deg);
  }
}
.custom-select-trigger {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  min-height: 38px;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.custom-select-trigger:hover {
  border-color: var(--brand);
}
.custom-select-trigger span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown-item:hover {
  background-color: #f1f5f9;
}
.dropdown-item.active {
  background-color: #e0f2fe;
  color: #0284c7;
  font-weight: 500;
}
.mono.series-C {
  color: var(--series-c, #2f7fff);
  background: rgba(47, 127, 255, 0.10);
}
.mono.series-D {
  color: var(--series-d, #7a5cff);
  background: rgba(122, 92, 255, 0.10);
}
.mono.series-S {
  color: var(--series-s, #94a3b8);
  background: rgba(148, 163, 184, 0.10);
}
.custom-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  pointer-events: none;
}
.custom-toast.success {
  background-color: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}
.custom-toast.error {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.custom-toast.info {
  background-color: #f0f9ff;
  color: #0284c7;
  border: 1px solid #bae6fd;
}

/* Toast 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
