<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleCreatePage · 页面 1.3 新建规则
   ═══════════════════════════════════════════════════════════════ */
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import Breadcrumb from "../../components/layout/Breadcrumb.vue";
import Icon from "../../components/icons/Icon.vue";
import SeriesTag from "../../components/common/SeriesTag.vue";
import CategoryChip from "../../components/common/CategoryChip.vue";
import PriorityChip from "../../components/common/PriorityChip.vue";
import ToggleSwitch from "../../components/common/ToggleSwitch.vue";
import FormField from "../../components/common/FormField.vue";
import SavedBanner from "../../components/rules/SavedBanner.vue";
import { createRule } from "../../data/rules-api.js";

import "../../assets/styles/rule-detail.css";

const router = useRouter();

const form = reactive({
  ruleCode: "",
  category: "通用",
  name: "",
  priority: "中",
  isEnabled: true,
  minValid: 3,
  minPass: 2,
  judgment: "",
  thresholdDesc: "",
  nodeReq: "",
  nodePriority: ""
});

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

const errors = reactive({
  ruleCode: "",
  name: ""
});

watch(() => form.name, () => {
  errors.name = "";
});
watch(() => form.ruleCode, () => {
  errors.ruleCode = "";
});

const confirmDialog = ref({
  show: false,
  title: "放弃编辑提示",
  message: "确定放弃已填写的内容并返回吗？",
  onResolve: null
});

const askConfirm = (msg = "确定要执行此操作吗？", title = "提示") => {
  return new Promise((resolve) => {
    confirmDialog.value.title = title;
    confirmDialog.value.message = msg;
    confirmDialog.value.show = true;
    confirmDialog.value.onResolve = (result) => {
      confirmDialog.value.show = false;
      resolve(result);
    };
  });
};

watch(() => confirmDialog.value.show, (newVal) => {
  if (newVal) {
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

const computedSeries = computed(() => {
  if (!form.ruleCode) return "C";
  const code = form.ruleCode.trim().toUpperCase();
  if (code.startsWith("C")) return "C";
  if (code.startsWith("D")) return "D";
  return "S";
});

// 新建页面只要修改了任何字段即为 dirty，允许保存
const isDirty = computed(() => {
  return form.ruleCode.trim() !== "" || form.name.trim() !== "" || form.nodePriority.trim() !== "";
});

const onSave = async () => {
  if (submitting.value) return;

  errors.ruleCode = "";
  errors.name = "";

  let hasError = false;
  if (!form.ruleCode.trim()) {
    errors.ruleCode = "分类编码为必填项";
    hasError = true;
  }
  if (!form.name.trim()) {
    errors.name = "规则名称为必填项";
    hasError = true;
  }

  if (hasError) {
    showToast("请修正表单中的错误项", "error");
    return;
  }

  submitting.value = true;

  const payload = {
    ruleCode: form.ruleCode.trim(),
    name: form.name.trim(),
    category: form.category,
    priority: form.priority,
    isEnabled: form.isEnabled,
    minValid: form.minValid,
    minPass: form.minPass,
    nodeReq: form.nodeReq.trim(),
    nodePriority: form.nodePriority.trim(),
    judgment: form.judgment,
    brief: form.thresholdDesc,
    ruleOrder: 100,
    state: 1
  };

  try {
    await createRule(payload);
    savedFields.value = Object.keys(payload);
    saved.value = true;
    sessionStorage.setItem("rules_active_tab", computedSeries.value);
    setTimeout(() => {
      saved.value = false;
      router.push("/rules");
    }, 1500);
  } catch (error) {
    showToast("创建规则失败: " + error.message, "error");
    submitting.value = false;
  }
};

const onCancel = async () => {
  if (isDirty.value) {
    const ok = await askConfirm("确定放弃已填写的内容并返回吗？", "放弃编辑");
    if (!ok) return;
  }
  router.push("/rules");
};
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', '判定规则', '新建规则']" />

    <!-- ─── 头部操作区 ─── -->
    <div class="detail-head">
      <button class="back-btn" @click="onCancel">
        <Icon name="chevron-l" :size="14" />
        <span>返回规则清单</span>
      </button>

      <div class="detail-head-main">
        <div class="detail-head-name" style="font-size: 20px; font-weight: 600;">新建判定规则</div>
      </div>

      <div class="detail-head-actions">
        <button class="btn ghost" @click="onCancel">
          <Icon name="x" :size="13" /> 取消并返回
        </button>
        <button class="btn primary" :disabled="submitting" @click="onSave">
          <Icon name="check" :size="13" /> {{ submitting ? '保存中...' : '保存并创建规则' }}
        </button>
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
        <span class="section-hint">配置规则的基础编号、名称和分类系列</span>
      </div>
      <div class="form-grid two-col">

        <FormField label="规则名称" required :error="errors.name">
          <input class="form-input" v-model="form.name" placeholder="请输入规则名称" />
        </FormField>

        <FormField label="设备类别" required hint="选择所关联的调适设备类别">
          <select class="form-input" v-model="form.category">
            <option value="通用">通用</option>
            <option value="冷水系统">冷水系统</option>
            <option value="AHU">AHU</option>
            <option value="冷却塔">冷却塔</option>
            <option value="采暖">采暖</option>
          </select>
        </FormField>

        <FormField label="分类编码" required hint="对应计算及手册编码，例如 C09、D06" :error="errors.ruleCode">
          <input class="form-input mono" v-model="form.ruleCode" placeholder="请输入分类编码，例如 C09" />
        </FormField>
        <FormField label="规则系列" read-only hint="根据分类编码首字母自动判定">
          <div class="ro-value"><SeriesTag :series="computedSeries" /></div>
        </FormField>

        <FormField label="优先级" required>
          <select class="form-input" v-model="form.priority">
            <option value="最高">最高</option>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
        </FormField>
        <FormField label="启用状态">
          <div class="toggle-with-label">
            <ToggleSwitch v-model="form.isEnabled" />
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
        <span class="section-hint">最少有效/触发窗口数，是规则判定的必要条件</span>
      </div>
      <div class="form-grid two-col">
        <FormField label="最少有效窗口数" hint="建议 ≥ 3，即分析窗口内至少有 3 个有效计算窗口">
          <input type="number" min="1" max="20" class="form-input mono" v-model.number="form.minValid" />
        </FormField>
        <FormField label="最少触发窗口数" hint="有效窗口中至少有几个触发，才判定为该规则命中">
          <input type="number" min="1" max="20" class="form-input mono" v-model.number="form.minPass" />
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
        <span class="section-hint">规则的核心判定逻辑及依据说明</span>
      </div>

      <div class="form-grid">
        <FormField label="判定标准描述" full-width hint="描述规则要检测的异常现象及计算原理依据">
          <textarea class="form-textarea" rows="3" v-model="form.judgment" placeholder="请输入判定标准描述" />
        </FormField>

        <FormField label="阈值描述" full-width :hint="computedSeries === 'D' ? 'D 系规则的阈值按业态差异化' : 'C 系全业态统一阈值'">
          <textarea class="form-textarea" rows="2" v-model="form.thresholdDesc" placeholder="请输入阈值计算公式或说明（例如 0.85）" />
        </FormField>

        <FormField label="所需计量节点" full-width hint="输入执行计算所需绑定的计量节点类型（通常以逗号分隔）">
          <input class="form-input mono" v-model="form.nodeReq" placeholder="例如 U2A01, U2A02, U2A00" />
        </FormField>

        <FormField label="节点优先级" full-width hint="匹配计量节点的先后顺序，以 > 分隔">
          <input class="form-input mono" v-model="form.nodePriority" placeholder="例如 U2A01>U2A02>U2A00" />
        </FormField>
      </div>
    </div>
    
    <!-- ─── Toast 提示组件 ─── -->
    <Teleport to="body">
      <div v-if="toast.show" class="edit-toast float-in" :class="toast.type">
        <Icon :name="toast.type === 'error' ? 'alert' : 'check'" :size="16" :stroke="toast.type === 'error' ? 'var(--danger)' : 'var(--brand)'" />
        <div style="flex: 1;">
          <div style="font-weight: 500; font-size: 13.5px; color: var(--text-0);">{{ toast.type === 'error' ? '验证未通过' : '提示' }}</div>
          <div class="toast-sub">{{ toast.message }}</div>
        </div>
        <button class="toast-close" @click="toast.show = false">
          <Icon name="x" :size="12" />
        </button>
      </div>
    </Teleport>

    <!-- ─── 自定义 Confirm 模态弹框 ─── -->
    <Teleport to="body">
      <div v-if="confirmDialog.show" class="modal-overlay" @click="confirmDialog.onResolve(false)">
        <div class="modal-card modal-confirm float-in" @click.stop>
          <div class="modal-head">
            <div class="modal-title-row">
              <Icon name="alert" :size="18" stroke="var(--danger)" />
              <div>
                <h3 class="modal-title">{{ confirmDialog.title }}</h3>
                <div class="modal-sub">
                  {{ confirmDialog.message }}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" @click="confirmDialog.onResolve(false)">取消</button>
            <button class="btn danger" @click="confirmDialog.onResolve(true)">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
