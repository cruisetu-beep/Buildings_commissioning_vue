<script setup>
/* ═══════════════════════════════════════════════════════════════
   ThresholdMatrixPage · 页面 2.1 业态阈值矩阵
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import MatrixCell from "../../components/params/MatrixCell.vue";
import SaveConfirmModal from "../../components/params/SaveConfirmModal.vue";
import ResetDefaultModal from "../../components/params/ResetDefaultModal.vue";
import { fetchFuncDict } from "../../data/buildings-api.js";
import { fetchRules } from "../../data/rules-api.js";
import {
  fetchThresholds,
  saveThresholds,
  resetThresholdsToDefault,
} from "../../data/threshold-matrix-api.js";

import "../../assets/styles/threshold-matrix.css";

const editMode = ref(false);
const thresholds = ref({});
const baseline = ref({}); // 当前"已保存"的基准值(用于判定 changed / 撤销)
const funcMap = ref({});
const rulesList = ref([]); // 后端配置的真实规则列表

// 动态提取判定规则行列表
const RULE_LIST = computed(() => {
  const keys = Object.keys(thresholds.value || {});
  return keys.filter(k => k.startsWith("D"));
});

// 动态读取业态分类列列表
const FUNC_LIST = computed(() => {
  return Object.keys(funcMap.value || {});
});

// 动态元数据规则自适应转换器，可完美兼容数据库新增的无数条规则
const getRuleMeta = (rule) => {
  const foundRule = rulesList.value.find(r => r.ruleCode === rule);
  const ruleName = foundRule ? foundRule.ruleName : rule;
  const judgment = foundRule ? foundRule.judgmentStandard : "";

  let type = "number";
  let options = [];
  let suffix = "";

  if (rule === "D02" || rule === "D03" || rule === "D04") {
    suffix = "%";
  } else if (rule === "D05") {
    type = "select";
    options = ["间歇运营", "客流上涨", "24h连续", "活动驱动", "寒暑假", "不参与"];
  }

  return {
    name: ruleName,
    short: ruleName.substring(0, 5),
    unit: suffix === "%" ? "%" : (rule === "D05" ? "策略" : ""),
    suffix,
    type,
    min: -999999,
    max: 999999,
    step: "any",
    direction: "",
    desc: judgment || ruleName,
    color: "var(--text-0)",
    options,
  };
};

const loading = ref(true);

const dRuleCount = computed(() => {
  return Object.keys(thresholds.value || {}).length;
});

const showSaveModal = ref(false);
const showResetModal = ref(false);
const savedFlash = ref(false);
const savedCount = ref(0);
const saveError = ref("");

onMounted(async () => {
  try {
    const data = await fetchThresholds();
    thresholds.value = data;
    baseline.value = JSON.parse(JSON.stringify(data));
    funcMap.value = await fetchFuncDict();
    rulesList.value = await fetchRules();
  } catch (err) {
    console.error("Failed to load initial thresholds & func dict:", err);
  } finally {
    loading.value = false;
  }
});

watch([showSaveModal, showResetModal], ([saveOpen, resetOpen]) => {
  if (saveOpen || resetOpen) {
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
  }
});

onUnmounted(() => {
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
});

// 计算所有修改项
const changes = computed(() => {
  const arr = [];
  for (const rule of RULE_LIST.value) {
    for (const func of FUNC_LIST.value) {
      if (thresholds.value[rule]?.[func] !== baseline.value[rule]?.[func]) {
        arr.push({
          rule,
          func,
          oldValue: baseline.value[rule][func],
          newValue: thresholds.value[rule][func],
        });
      }
    }
  }
  return arr;
});

const isDirty = computed(() => changes.value.length > 0);

// 校验:数值型是否合法
const isCellValid = (rule, func) => {
  const meta = getRuleMeta(rule);
  const v = thresholds.value[rule]?.[func];
  if (meta.type === "select") return meta.options.includes(v);
  if (v === "" || v == null) return false;
  const num = parseFloat(v);
  return !isNaN(num);
};

const hasInvalid = computed(() => {
  for (const r of RULE_LIST.value) for (const f of FUNC_LIST.value) if (!isCellValid(r, f)) return true;
  return false;
});

// 设置单元格值
const setCell = (rule, func, value) => {
  thresholds.value = {
    ...thresholds.value,
    [rule]: { ...thresholds.value[rule], [func]: value },
  };
};

// 撤销所有变更(回到基准值)
const undoChanges = () => {
  thresholds.value = JSON.parse(JSON.stringify(baseline.value));
};

// 保存
const openSaveModal = () => {
  if (!isDirty.value || hasInvalid.value) return;
  showSaveModal.value = true;
};
const doSave = async () => {
  showSaveModal.value = false;
  const count = changes.value.length;
  saveError.value = "";
  try {
    await saveThresholds(changes.value);
    baseline.value = JSON.parse(JSON.stringify(thresholds.value));
    savedCount.value = count;
    savedFlash.value = true;
    setTimeout(() => (savedFlash.value = false), 4500);
  } catch (e) {
    saveError.value = "保存失败,请稍后重试(后端接口暂未就绪时属预期行为)";
    setTimeout(() => (saveError.value = ""), 5000);
  }
};

// 恢复默认
const doResetDefault = async () => {
  showResetModal.value = false;
  const success = await resetThresholdsToDefault();
  if (success) {
    const data = await fetchThresholds();
    thresholds.value = data;
    baseline.value = JSON.parse(JSON.stringify(data));
  }
};

// 切换编辑模式:如果有未保存变更,提示
const toggleEditMode = () => {
  if (editMode.value && isDirty.value) {
    if (confirm(`当前有 ${changes.value.length} 项未保存的变更,退出编辑模式将放弃这些修改。是否继续?`)) {
      undoChanges();
      editMode.value = false;
    }
  } else {
    editMode.value = !editMode.value;
  }
};

const onJumpToMatrix = () => {
  // 阈值矩阵页面本身即此页,预留占位(与 1.2 详情页的跳转链接呼应)
};
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '参数配置', '业态阈值矩阵']" />

    <div class="page-head">
      <div>
        <h1 class="page-title">
          <Icon name="sliders" :size="22" stroke="var(--brand)" />
          业态阈值矩阵
        </h1>
        <div class="page-subtitle" style="max-width: none;">
          <b>D 系 {{ dRuleCount }} 条规则</b>在 <b>11 个业态</b>下的差异化阈值配置。修改后<b>立即生效</b>，下次判定计算采用新值，历史判定结果不受影响。数据源 <code class="inline-code mono">T_ST_CxRuleFuncThreshold</code>。
        </div>
      </div>
      <div class="page-head-actions">
        <div class="edit-mode-switcher">
          <button class="ems-btn" :class="{ active: !editMode }" :disabled="!editMode" @click="toggleEditMode">
            <Icon name="eye" :size="13" /> 查看
          </button>
          <button class="ems-btn" :class="{ active: editMode }" :disabled="editMode" @click="toggleEditMode">
            <Icon name="edit" :size="13" /> 编辑
          </button>
        </div>
      </div>
    </div>

    <!-- 顶部动作条 -->
    <div class="matrix-action-bar">
      <div class="mab-left">
        <div class="mab-mode-tip">
          <template v-if="editMode">
            <Icon name="edit" :size="12" stroke="var(--warn)" />
            <span><b>编辑模式已启用</b> · 点击任意单元格修改阈值,BY 居民不参与判定故不显示</span>
          </template>
          <template v-else>
            <Icon name="lock" :size="12" stroke="var(--text-2)" />
            <span>只读模式 · 悬停单元格查看该阈值影响的建筑数,点击"编辑"进入编辑模式</span>
          </template>
        </div>
      </div>
      <div class="mab-right">
        <span v-if="isDirty" class="mab-dirty-badge">
          <span class="dirty-dot" />
          <span class="mono">{{ changes.length }}</span> 项未保存
        </span>
        <span v-if="hasInvalid" class="mab-invalid-badge">
          <Icon name="alert" :size="11" stroke="var(--danger)" />
          <span>校验失败</span>
        </span>
        <button v-if="editMode" class="btn ghost sm" @click="showResetModal = true">
          <Icon name="x" :size="12" /> 恢复默认
        </button>
        <button v-if="editMode" class="btn ghost sm" :disabled="!isDirty" @click="undoChanges">
          <Icon name="chevron-l" :size="12" /> 撤销全部
        </button>
        <button v-if="editMode" class="btn primary sm" :disabled="!isDirty || hasInvalid" @click="openSaveModal">
          <Icon name="check" :size="13" /> 保存变更
        </button>
      </div>
    </div>

    <!-- 保存失败提示 -->
    <div v-if="saveError" class="s-banner float-in" style="margin: 0 0 16px 0">
      <Icon name="alert" :size="15" stroke="#d97706" />
      <div class="s-banner-text">{{ saveError }}</div>
    </div>

    <!-- 保存成功横幅 -->
    <div v-if="savedFlash" class="saved-banner float-in" style="margin-top: 0; margin-bottom: 16px">
      <Icon name="check" :size="16" stroke="var(--ok)" />
      <div>
        <b>{{ savedCount }} 项阈值变更已保存并立即生效。</b>
        <div class="saved-sub">
          下次判定计算将采用新阈值 · 历史判定结果不受影响 · 建议在"运行历史(7.x)"查看前后对比
        </div>
      </div>
    </div>

    <!-- 阈值矩阵主表 -->
    <div class="card glow threshold-matrix-card">
      <div class="matrix-scroll">
        <table class="threshold-matrix">
          <thead>
            <tr>
              <th class="th-func"><span class="th-label">业态</span></th>
              <th v-for="rule in RULE_LIST" :key="rule" class="th-rule">
                <div class="th-rule-code mono">{{ rule }}</div>
                <div class="th-rule-name">{{ getRuleMeta(rule).short }}</div>
                <div class="th-rule-dir">
                  <span v-if="getRuleMeta(rule).direction" class="th-dir mono">{{ getRuleMeta(rule).direction }}</span>
                  <span class="th-desc">{{ getRuleMeta(rule).desc }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="func in FUNC_LIST" :key="func">
              <td class="td-func">
                <div class="td-func-code mono">{{ func }}</div>
                <div class="td-func-name">{{ funcMap[func] }}</div>
              </td>
              <td v-for="rule in RULE_LIST" :key="rule" class="td-cell">
                <MatrixCell
                  v-if="thresholds[rule]"
                  :rule="rule"
                  :func="func"
                  :func-name="funcMap[func] || ''"
                  :value="thresholds[rule][func]"
                  :original="baseline[rule][func]"
                  :editable="editMode"
                  :meta="getRuleMeta(rule)"
                  :valid="isCellValid(rule, func)"
                  @change="(v) => setCell(rule, func, v)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BY 居民住宅:整行灰化说明,独立横幅(避免 table-layout:fixed 下跨列单元格宽度计算异常) -->
      <div class="by-disabled-banner">
        <span class="td-func-code mono">BY</span>
        <span class="td-disabled-name">居民住宅</span>
        <span class="td-disabled-divider" />
        <Icon name="lock" :size="11" stroke="var(--text-3)" />
        <span class="td-disabled-text">居民住宅不参与调适判定 · 数据保留占位,不参与计算</span>
      </div>

      <div class="matrix-footer">
        <div class="footer-hint">
          <Icon name="info" :size="12" stroke="var(--text-2)" />
          <span>单元格右上角数字表示该阈值影响的建筑数。修改后单元格显示橙色标记,保存前可点"撤销全部"回滚</span>
        </div>
        <div class="footer-meta mono">
          5 规则 × 11 业态 = 55 阈值 · 数据源 <code class="inline-code">T_ST_CxRuleFuncThreshold</code>
        </div>
      </div>
    </div>

    <!-- 图例卡片 -->
    <div class="card matrix-legend-card">
      <div class="legend-title">
        <Icon name="info" :size="13" stroke="var(--brand)" />
        <span>阈值判定方向说明</span>
      </div>
      <div class="legend-grid">
        <div v-for="r in RULE_LIST" :key="r" class="legend-row">
          <span class="legend-code mono" :style="{ color: THRESHOLD_RULE_META[r].color }">{{ r }}</span>
          <span class="legend-text">
            <span class="legend-name">{{ THRESHOLD_RULE_META[r].name }}</span>
            <span class="legend-desc">
              <b v-if="THRESHOLD_RULE_META[r].direction" class="mono">{{ THRESHOLD_RULE_META[r].direction }}</b>
              {{ THRESHOLD_RULE_META[r].desc }}
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <Teleport to="body">
      <SaveConfirmModal
        v-if="showSaveModal"
        :changes="changes"
        @confirm="doSave"
        @cancel="showSaveModal = false"
      />
    </Teleport>
    <Teleport to="body">
      <ResetDefaultModal
        v-if="showResetModal"
        @confirm="doResetDefault"
        @cancel="showResetModal = false"
      />
    </Teleport>
  </div>
</template>
