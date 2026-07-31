<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailModal · 规则详细弹窗
   基础信息(名称/唯一标识/适用范围) + 算法与原理四小节(物理原理 /
   数学算式与步骤 / 算法数据种类与精确来源 / 关键参数工程学依据),
   内容完全从数据库 T_ST_CxRuleMeta 拉取渲染，不含 Mock 假数据。
   ═══════════════════════════════════════════════════════════════ */
import { ref, onMounted, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import MarkdownView from "../common/MarkdownView.vue";
import { fetchRuleDetail } from "../../data/rules-api.js";
import "../../assets/styles/markdown.css";

const props = defineProps({
  ruleId: { type: String, required: true }, // 数据库真实的 ruleId，如 CR0016
  ruleName: { type: String, default: "" }, // 备用降级显示名称
});
const emit = defineEmits(["close"]);

const dbMeta = ref(null);
const loading = ref(true);

const fetchDetail = async () => {
  loading.value = true;
  try {
    const res = await fetchRuleDetail(props.ruleId);
    dbMeta.value = res;
  } catch (e) {
    console.error("fetchRuleDetail failed:", e);
    dbMeta.value = null;
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDetail);
watch(() => props.ruleId, fetchDetail);

// 提取基础信息
const metaData = computed(() => {
  if (!dbMeta.value) return null;
  return {
    name: dbMeta.value.name || props.ruleName || "—",
    cxRuleId: dbMeta.value.cxRuleId || props.ruleId,
    scope: dbMeta.value.requiredNodeTypes || "全部业态",
    version: dbMeta.value.parameterBasis ? "v4.0 规范" : "v3.1 重构方案"
  };
});

const fieldsConfig = [
  { key: 'physicsPrinciple', defaultTitle: '物理原理' },
  { key: 'mathFormula', defaultTitle: '数学算式与步骤' },
  { key: 'desc', defaultTitle: '算法描述与参数' },
  { key: 'algorithmDataSource', defaultTitle: '算法数据种类与精确来源' },
  { key: 'parameterBasis', defaultTitle: '关键参数工程学依据' }
];

// 从数据库拉取物理原理、算式等 MD 内容进行动态解析与组装
const sections = computed(() => {
  if (!dbMeta.value) return [];
  
  const list = [];
  fieldsConfig.forEach(cfg => {
    const rawVal = dbMeta.value[cfg.key];
    if (!rawVal) return;
    
    const trimmed = rawVal.trim();
    if (trimmed.length === 0) return;
    
    // 匹配开头形如 "### 标题名\n" 或 "### 标题名\r\n" 
    const match = trimmed.match(/^#+\s*(.+?)(\r?\n)+/);
    if (match) {
      const title = match[1].trim();
      const content = trimmed.substring(match[0].length).trim();
      list.push({ title, body: content });
    } else {
      // 降级：如果开头没有 Markdown 标题，直接使用兜底默认标题展示整段内容
      list.push({ title: cfg.defaultTitle, body: trimmed });
    }
  });

  return list;
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="emit('close')">
      <div class="modal-card modal-rule-detail float-in" @click.stop>
        <div class="modal-head rdm-head">
          <div class="rdm-title-row">
            <Icon name="rules" :size="16" stroke="var(--brand)" />
            <h3 class="modal-title">规则详细</h3>
          </div>
          <button class="rdm-close" title="关闭" @click="emit('close')">
            <Icon name="x" :size="14" />
          </button>
        </div>

        <div class="modal-body rdm-body">
          <!-- 1. 加载状态 -->
          <div v-if="loading" class="rdm-loading" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-3); gap: 12px;">
            <Icon name="rules" :size="24" stroke="var(--brand)" style="opacity: 0.6;" />
            <span style="font-size: 13px;">正在读取数据库规则元数据...</span>
          </div>

          <!-- 2. 真实数据就绪渲染 -->
          <template v-else-if="metaData">
            <!-- 基础信息 -->
            <div class="rdm-basic">
              <div class="rdm-rule-name">
                <span class="rdm-code mono">{{ ruleId }}</span>
                <span>{{ metaData.name }}</span>
              </div>
              <div class="rdm-fields">
                <div class="rdm-field">
                  <span class="rdm-field-label">唯一标识</span>
                  <span class="rdm-field-value mono">{{ metaData.cxRuleId }}</span>
                </div>
                <div class="rdm-field">
                  <span class="rdm-field-label">适用范围</span>
                  <span class="rdm-field-value">{{ metaData.scope }}</span>
                </div>
                <div v-if="metaData.version" class="rdm-field">
                  <span class="rdm-field-label">方案版本</span>
                  <span class="rdm-field-value">{{ metaData.version }}</span>
                </div>
              </div>
            </div>

            <!-- 算法与原理: 渲染 MD -->
            <div class="rdm-sections">
              <div class="rdm-sections-head">算法与原理</div>
              <div v-for="s in sections" :key="s.title" class="rdm-section">
                <div class="rdm-section-title">{{ s.title }}</div>
                <MarkdownView :source="s.body" />
              </div>
            </div>
          </template>

          <!-- 3. 确实查无此数据时的空提示 -->
          <div v-else class="rdm-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-3); gap: 12px;">
            <Icon name="lock" :size="24" stroke="var(--text-3)" style="opacity: 0.6;" />
            <span style="font-size: 13px;">规则 {{ ruleId }} 在数据库中暂无详细元数据记录</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
