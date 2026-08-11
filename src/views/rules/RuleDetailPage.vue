<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailPage · 页面 1.2 规则详情
   ═══════════════════════════════════════════════════════════════ */
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import SeriesTag from "../../components/common/SeriesTag.vue";
import CategoryChip from "../../components/common/CategoryChip.vue";
import PriorityChip from "../../components/common/PriorityChip.vue";
import ToggleSwitch from "../../components/common/ToggleSwitch.vue";
import FormField from "../../components/common/FormField.vue";
import ThresholdPreview from "../../components/rules/ThresholdPreview.vue";
import ManualCollapse from "../../components/rules/ManualCollapse.vue";
import SavedBanner from "../../components/rules/SavedBanner.vue";
import { fetchRuleDetail, updateRule, getManual, THRESHOLD_MAP } from "../../data/rules-api.js";

import "../../assets/styles/rule-detail.css";

const route = useRoute();
const router = useRouter();

const rule = ref(null);
const loading = ref(true);

onMounted(async () => {
  rule.value = await fetchRuleDetail(route.params.id);
  loading.value = false;
  if (rule.value) initForm();
});

const isSeriesLocked = computed(() => rule.value && rule.value.series === "S");

const initial = ref({});
const form = reactive({});
const saved = ref(false);
const savedFields = ref([]);
const submitting = ref(false);

const toast = ref({
  show: false,
  message: "",
  type: "info"
});

const showToast = (msg, type = "info") => {
  toast.value.message = msg;
  toast.value.type = type;
  toast.value.show = true;
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

function initForm() {
  console.log("Debug initForm: category =", rule.value.category);
  console.log("Debug initForm: rule.value =", JSON.stringify(rule.value));
  initial.value = {
    name: rule.value.name,
    priority: rule.value.priority,
    minValid: rule.value.minValid,
    minPass: rule.value.minPass,
    isEnabled: rule.value.isEnabled,
    judgment: getManual(rule.value).judgment,
    thresholdDesc: THRESHOLD_MAP[rule.value.ruleCode]
      ? `${THRESHOLD_MAP[rule.value.ruleCode].unit}(按 12 业态差异化)`
      : rule.value.brief,
    category: rule.value.category,
    nodeReq: rule.value.nodeReq || "",
    nodePriority: rule.value.nodePriority || ""
  };
  Object.assign(form, initial.value);
}

const isFieldChanged = (key) => form[key] !== initial.value[key];
const changedKeys = computed(() => Object.keys(initial.value).filter((k) => form[k] !== initial.value[k]));
const isDirty = computed(() => changedKeys.value.length > 0);

const onSave = async () => {
  if (!isDirty.value || isSeriesLocked.value || submitting.value) return;
  submitting.value = true;
  
  try {
    savedFields.value = changedKeys.value;
    
    // 1. 调用后端接口更新，将现有规则的完整属性和表单修改合并发送，避免缺少必填字段导致 400 错误
    // 修正：将 thresholdDesc 映射回 brief 发给后端
    const payload = { ...rule.value, ...form, brief: form.thresholdDesc };
    await updateRule(rule.value.cxRuleId, payload);
    
    // 2. 替换 rule 的整个引用，迫使 Vue 深度更新顶部及所有依赖 rule 属性的 UI
    rule.value = { ...rule.value, ...form, brief: form.thresholdDesc };
    
    // 3. 重新调用初始加载表单方法，重置 initial 基线并对齐 form
    initForm();
    saved.value = true;
    setTimeout(() => (saved.value = false), 4000);
  } catch (error) {
    showToast("保存失败: " + error.message, "error");
  } finally {
    submitting.value = false;
  }
};

const onCancel = () => {
  Object.assign(form, initial.value);
};

const onBack = () => router.push("/rules");

const onJumpToMatrix = () => {
  router.push("/params");
};
</script>

<template>
  <div class="rule-detail-page-container">
    <div v-if="rule" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定规则', '规则详情']" />

    <!-- ─── 详情页头部 ─── -->
    <div class="detail-head">
      <button class="back-btn" @click="onBack">
        <Icon name="chevron-l" :size="14" />
        <span>返回规则清单</span>
      </button>

      <div class="detail-head-main">
        <div class="detail-head-title">
          <span class="detail-code display mono">{{ rule.ruleCode }}</span>
          <SeriesTag :series="rule.series" />
          <CategoryChip :category="rule.category" />
          <PriorityChip :priority="rule.priority" />
          <span
            v-if="rule.isEnabled"
            class="chip"
            style="color: #10b981; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.25)"
          >
            已启用
          </span>
          <span
            v-else
            class="chip"
            style="color: var(--warn); background: rgba(217,119,6,0.08); border-color: rgba(217,119,6,0.25)"
          >
            已停用
          </span>
        </div>
        <div class="detail-head-name">{{ rule.name }}</div>
        <div class="detail-head-meta">
          <span>规则编号 <span class="mono">{{ rule.cxRuleId }}</span></span>
          <span class="meta-sep">·</span>
          <span>数据源 <code class="inline-code mono">T_ST_CxRule</code></span>
          <template v-if="isDirty">
            <span class="meta-sep">·</span>
            <span class="dirty-hint">
              <span class="dirty-dot" />
              {{ changedKeys.length }} 项未保存的变更
            </span>
          </template>
        </div>
      </div>

      <div class="detail-head-actions">
        <button class="btn ghost" :disabled="!isDirty" @click="onCancel">
          <Icon name="x" :size="13" /> 放弃变更
        </button>
        <button
          class="btn primary"
          :disabled="!isDirty || isSeriesLocked || submitting"
          :title="isSeriesLocked ? 'S系规则当前批次不可编辑' : ''"
          @click="onSave"
        >
          <Icon name="check" :size="13" /> {{ submitting ? '保存中...' : '保存并立即生效' }}
        </button>
      </div>
    </div>

    <!-- S 系锁定提示 -->
    <div v-if="isSeriesLocked" class="s-banner detail-banner">
      <Icon name="lock" :size="15" stroke="#d97706" />
      <div class="s-banner-text">
        <b>S 系规则当前批次未启用,规则字段不可编辑。</b>
        S 系专属规则的计算逻辑仍在优化中,规则定义仅供查阅,不参与判定计算。
      </div>
    </div>

    <!-- 保存成功提示 -->
    <SavedBanner :show="saved" :changed-fields="savedFields" />

    <!-- ─── 基本信息卡片 ─── -->
    <div class="card glow detail-card">
      <div class="detail-section-head">
        <div class="section-title-row">
          <Icon name="info" :size="15" stroke="var(--brand)" />
          <span class="detail-section-title">基本信息</span>
        </div>
        <span class="section-hint">规则的核心标识与状态字段</span>
      </div>
      <div class="form-grid two-col">
        <FormField label="规则编号" read-only>
          <div class="ro-value mono">{{ rule.cxRuleId }}</div>
        </FormField>
        <FormField label="分类编码" read-only>
          <div class="ro-value"><span class="code-badge mono">{{ rule.ruleCode }}</span></div>
        </FormField>
        <FormField label="规则系列" read-only>
          <div class="ro-value"><SeriesTag :series="rule.series" /></div>
        </FormField>
        <FormField label="设备类别" required :changed="isFieldChanged('category')">
          <select class="form-input" v-model="form.category" :disabled="isSeriesLocked">
            <option value="通用">通用</option>
            <option value="冷水系统">冷水系统</option>
            <option value="AHU">AHU</option>
            <option value="冷却塔">冷却塔</option>
            <option value="采暖">采暖</option>
          </select>
        </FormField>

        <FormField label="规则名称" required :changed="isFieldChanged('name')" full-width>
          <input class="form-input" v-model="form.name" :disabled="isSeriesLocked" />
        </FormField>

        <FormField label="优先级" required :changed="isFieldChanged('priority')">
          <select class="form-input" v-model="form.priority" :disabled="isSeriesLocked">
            <option value="最高">最高</option>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
        </FormField>
        <FormField label="启用状态" :changed="isFieldChanged('isEnabled')">
          <div class="toggle-with-label">
            <ToggleSwitch
              v-model="form.isEnabled"
              :disabled="isSeriesLocked"
              disabled-reason="S系规则当前批次未启用"
            />
            <span class="toggle-hint" :class="form.isEnabled ? 'on' : 'off'">
              {{ form.isEnabled ? "已启用,参与判定计算" : "已停用,不参与判定" }}
            </span>
          </div>
        </FormField>
      </div>
    </div>

    <!-- ─── 窗口配置卡片 ─── -->
    <div class="card glow detail-card">
      <div class="detail-section-head">
        <div class="section-title-row">
          <Icon name="target" :size="15" stroke="var(--brand)" />
          <span class="detail-section-title">窗口配置</span>
        </div>
        <span class="section-hint">最少有效/触发窗口数,是规则判定的必要条件</span>
      </div>
      <div class="form-grid two-col">
        <FormField
          label="最少有效窗口数"
          hint="建议 ≥ 3,即分析窗口内至少有 3 个有效计算窗口"
          :changed="isFieldChanged('minValid')"
        >
          <input
            type="number" min="1" max="20"
            class="form-input mono"
            v-model.number="form.minValid"
            :disabled="isSeriesLocked"
          />
        </FormField>
        <FormField
          label="最少触发窗口数"
          hint="有效窗口中至少多少个触发,才判定为该规则命中"
          :changed="isFieldChanged('minPass')"
        >
          <input
            type="number" min="1" max="20"
            class="form-input mono"
            v-model.number="form.minPass"
            :disabled="isSeriesLocked"
          />
        </FormField>
      </div>
    </div>

    <!-- ─── 判定标准与阈值 ─── -->
    <div class="card glow detail-card">
      <div class="detail-section-head">
        <div class="section-title-row">
          <Icon name="rules" :size="15" stroke="var(--brand)" />
          <span class="detail-section-title">判定标准与阈值</span>
        </div>
        <span class="section-hint">规则的核心判定逻辑说明</span>
      </div>

      <div class="form-grid">
        <FormField
          label="判定标准描述" full-width :changed="isFieldChanged('judgment')"
          hint="描述规则要检测的异常现象及依据"
        >
          <textarea class="form-textarea" rows="3" :disabled="isSeriesLocked" v-model="form.judgment" />
        </FormField>

        <FormField
          label="阈值描述" full-width :changed="isFieldChanged('thresholdDesc')"
          :hint="rule.series === 'D' ? 'D 系规则的阈值按业态差异化,详见下方矩阵' : 'C 系全业态统一阈值'"
        >
          <textarea class="form-textarea" rows="2" :disabled="isSeriesLocked" v-model="form.thresholdDesc" />
        </FormField>

        <FormField
          label="所需计量节点" full-width :changed="isFieldChanged('nodeReq')"
          hint="配置执行计算所需绑定的计量节点类型，以逗号分隔"
        >
          <input class="form-input mono" v-model="form.nodeReq" :disabled="isSeriesLocked" />
        </FormField>

        <FormField
          label="节点优先级" full-width :changed="isFieldChanged('nodePriority')"
          hint="匹配计量节点的先后顺序权重，以 > 分隔"
        >
          <input class="form-input mono" v-model="form.nodePriority" :disabled="isSeriesLocked" />
        </FormField>
      </div>
    </div>

    <!-- ─── D 系业态阈值预览 ─── -->
    <div v-if="rule.series === 'D' && THRESHOLD_MAP[rule.ruleCode]" class="card glow detail-card">
      <div class="detail-section-head">
        <div class="section-title-row">
          <Icon name="sliders" :size="15" stroke="var(--brand)" />
          <span class="detail-section-title">业态差异化阈值</span>
        </div>
        <span class="section-hint">该规则在各分业态下的阈值配置（其中居民不参与判定）</span>
      </div>
      <ThresholdPreview :rule-code="rule.ruleCode" @jump-to-matrix="onJumpToMatrix" />
    </div>

    <!-- ─── 规则手册折叠区 ─── -->
    <ManualCollapse :rule="rule" />


  </div>

  <div v-else-if="!loading" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定规则', '规则详情']" />
    <div class="card glow" style="padding: 60px; text-align: center; color: var(--text-2)">
      未找到该规则(ID: {{ route.params.id }})
    </div>
  </div>

  <!-- ─── Toast 提示组件 ─── -->
  <div v-if="toast.show" class="edit-toast float-in" :class="toast.type">
    <Icon :name="toast.type === 'error' ? 'alert' : 'check'" :size="16" :stroke="toast.type === 'error' ? 'var(--danger)' : 'var(--brand)'" />
    <div style="flex: 1;">
      <div style="font-weight: 500; font-size: 13.5px; color: var(--text-0);">提示</div>
      <div class="toast-sub">{{ toast.message }}</div>
    </div>
    <button class="toast-close" @click="toast.show = false">
      <Icon name="x" :size="12" />
    </button>
  </div>
  </div>
</template>

