<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailModal · 规则详细弹窗
   基础信息(名称/唯一标识/适用范围) + 算法与原理四小节(物理原理 /
   数学算式与步骤 / 算法数据种类与精确来源 / 关键参数工程学依据),
   四小节以 markdown + LaTeX 渲染。内容来自 rule-meta mock(后端就绪后
   换接口)。必须 <Teleport to="body">(祖先 .float-in 的 transform 会让
   position:fixed 失效)。
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import MarkdownView from "../common/MarkdownView.vue";
import { getRuleMeta } from "../../data/rule-meta.js";
import "../../assets/styles/markdown.css";

const props = defineProps({
  ruleCode: { type: String, required: true },
  ruleName: { type: String, default: "" }, // 后端名称,mock 缺失时兜底
});
const emit = defineEmits(["close"]);

const meta = computed(() => getRuleMeta(props.ruleCode));

const sections = computed(() => {
  const m = meta.value;
  if (!m) return [];
  return [
    { title: "物理原理", body: m.principle },
    { title: "数学算式与步骤", body: m.mathSteps },
    { title: "算法数据种类与精确来源", body: m.dataSource },
    { title: "关键参数工程学依据", body: m.paramBasis },
  ].filter((s) => s.body);
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
          <template v-if="meta">
            <!-- 基础信息 -->
            <div class="rdm-basic">
              <div class="rdm-rule-name">
                <span class="rdm-code mono">{{ ruleCode }}</span>
                <span>{{ meta.name }}</span>
              </div>
              <div class="rdm-fields">
                <div class="rdm-field">
                  <span class="rdm-field-label">唯一标识</span>
                  <span class="rdm-field-value mono">{{ meta.cxRuleId }}</span>
                </div>
                <div class="rdm-field">
                  <span class="rdm-field-label">适用范围</span>
                  <span class="rdm-field-value">{{ meta.scope }}</span>
                </div>
                <div v-if="meta.version" class="rdm-field">
                  <span class="rdm-field-label">方案版本</span>
                  <span class="rdm-field-value">{{ meta.version }}</span>
                </div>
              </div>
            </div>

            <!-- 算法与原理:四小节 -->
            <div class="rdm-sections">
              <div class="rdm-sections-head">算法与原理</div>
              <div v-for="s in sections" :key="s.title" class="rdm-section">
                <div class="rdm-section-title">{{ s.title }}</div>
                <MarkdownView :source="s.body" />
              </div>
            </div>
          </template>

          <div v-else class="rdm-empty">
            <Icon name="lock" :size="18" stroke="var(--text-3)" />
            <span>规则 {{ ruleCode }} 的详细内容待接入</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
