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
import { fetchRules, updateRule, getManual, THRESHOLD_MAP } from "../../data/rules-api.js";

import "../../assets/styles/rule-detail.css";

const route = useRoute();
const router = useRouter();

const rule = ref(null);
const loading = ref(true);

onMounted(async () => {
  const all = await fetchRules();
  rule.value = all.find((r) => r.cxRuleId === route.params.id) || null;
  loading.value = false;
  if (rule.value) initForm();
});

const isSeriesLocked = computed(() => rule.value && rule.value.series === "S");

let initial = {};
const form = reactive({});
const saved = ref(false);
const savedFields = ref([]);

function initForm() {
  initial = {
    name: rule.value.name,
    priority: rule.value.priority,
    minValid: rule.value.minValid,
    minPass: rule.value.minPass,
    isEnabled: rule.value.isEnabled,
    judgment: getManual(rule.value).judgment,
    thresholdDesc: THRESHOLD_MAP[rule.value.ruleCode]
      ? `${THRESHOLD_MAP[rule.value.ruleCode].unit}(按 12 业态差异化)`
      : rule.value.brief,
  };
  Object.assign(form, initial);
}

const isFieldChanged = (key) => form[key] !== initial[key];
const changedKeys = computed(() => Object.keys(initial).filter((k) => form[k] !== initial[k]));
const isDirty = computed(() => changedKeys.value.length > 0);

const onSave = async () => {
  if (!isDirty.value || isSeriesLocked.value) return;
  savedFields.value = changedKeys.value;
  saved.value = true;
  await updateRule(rule.value.cxRuleId, { ...form });
  initial = { ...form };
  setTimeout(() => (saved.value = false), 4000);
};

const onCancel = () => {
  Object.assign(form, initial);
};

const onBack = () => router.push("/rules");

const onJumpToMatrix = () => {
  alert("阈值矩阵(2.1)将在下一个页面实现");
};
</script>

<template>
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
            v-if="!rule.isEnabled"
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
          :disabled="!isDirty || isSeriesLocked"
          :title="isSeriesLocked ? 'S系规则当前批次不可编辑' : ''"
          @click="onSave"
        >
          <Icon name="check" :size="13" /> 保存并立即生效
        </button>
      </div>
    </div>

    <!-- S 系锁定提示 -->
    <div v-if="isSeriesLocked" class="s-banner detail-banner">
      <Icon name="lock" :size="15" stroke="#d97706" />
      <div class="s-banner-text">
        <b>S 系规则当前批次未启用,规则字段不可编辑。</b>
        21 条业态专属规则的计算逻辑仍在优化中,规则定义仅供查阅,不参与判定计算。
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
        <FormField label="设备类别" read-only>
          <div class="ro-value"><CategoryChip :category="rule.category" /></div>
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
            <option value="分组">分组(仅 D05)</option>
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
        label="所需计量节点" read-only full-width
        hint="节点要求由数据源约束,不可修改。变更请提交系统调整申请"
      >
        <div class="ro-value ro-value-block mono">{{ rule.nodeReq }}</div>
      </FormField>
    </div>

    <!-- ─── D 系业态阈值预览 ─── -->
    <div v-if="rule.series === 'D' && THRESHOLD_MAP[rule.ruleCode]" class="card glow detail-card">
      <div class="detail-section-head">
        <div class="section-title-row">
          <Icon name="sliders" :size="15" stroke="var(--brand)" />
          <span class="detail-section-title">业态差异化阈值</span>
        </div>
        <span class="section-hint">该规则在 11 个业态下的阈值配置(BY 居民不参与判定)</span>
      </div>
      <ThresholdPreview :rule-code="rule.ruleCode" @jump-to-matrix="onJumpToMatrix" />
    </div>

    <!-- ─── 规则手册折叠区 ─── -->
    <ManualCollapse :rule="rule" />

    <!-- ─── 底部快捷跳转 ─── -->
    <div class="detail-quick-links">
      <button class="quick-link-btn">
        <Icon name="target" :size="14" stroke="var(--brand)" />
        <div>
          <div class="ql-title">查看命中该规则的建筑清单</div>
          <div class="ql-sub">→ 页面 4.2 · 规则维度视图(待第二批)</div>
        </div>
      </button>
      <button class="quick-link-btn">
        <Icon name="flask" :size="14" stroke="var(--brand)" />
        <div>
          <div class="ql-title">查看该规则的算法可视化</div>
          <div class="ql-sub">→ 页面 5.2 · 计算过程与数据</div>
        </div>
      </button>
    </div>
  </div>

  <div v-else-if="!loading" class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定规则', '规则详情']" />
    <div class="card glow" style="padding: 60px; text-align: center; color: var(--text-2)">
      未找到该规则(ID: {{ route.params.id }})
    </div>
  </div>
</template>
