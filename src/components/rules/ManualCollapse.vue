<script setup>
/* ═══════════════════════════════════════════════════════════════
   ManualCollapse · 规则手册原文折叠区
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import { marked } from "marked";
import katex from "katex";
import "katex/dist/katex.min.css";
import "../../assets/styles/markdown.css";

const props = defineProps({
  rule: { type: Object, required: true },
});

const expanded = ref(false);

const hasMeta = computed(() => {
  return props.rule && (
    props.rule.physicsPrinciple ||
    props.rule.mathFormula ||
    props.rule.algorithmDataSource ||
    props.rule.parameterBasis ||
    props.rule.desc
  );
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
  if (!props.rule) return [];
  
  const list = [];
  fieldsConfig.forEach(cfg => {
    const rawVal = props.rule[cfg.key];
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

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true
});

const preprocessTableMath = (text) => {
  if (!text) return "";
  const lines = text.split("\n");
  const processedLines = lines.map(line => {
    // 判断是否为表格行 (包含至少两个 | 符号)
    if ((line.match(/\|/g) || []).length >= 2) {
      const parts = line.split("|");
      const newParts = parts.map((part) => {
        // 如果是表头分割线 (例如 :--- 或 ---) 或者是首尾空项，就不处理
        if (/^\s*:?-+:?\s*$/.test(part.trim())) {
          return part;
        }
        let trimmed = part.trim();
        // 如果含有反斜杠 \ 且没有被 $ 包裹
        if (trimmed && trimmed.includes('\\') && !trimmed.startsWith('$') && !trimmed.endsWith('$')) {
          const leftSpaces = part.match(/^\s*/)[0];
          const rightSpaces = part.match(/\s*$/)[0];
          return `${leftSpaces}$${trimmed}$${rightSpaces}`;
        }
        return part;
      });
      return newParts.join("|");
    }
    return line;
  });
  return processedLines.join("\n");
};

const renderMarkdown = (text) => {
  if (!text) return "";

  // 预处理：为表格中没有被 $ 包裹的 LaTeX 公式套上 $ 符号
  const preprocessedText = preprocessTableMath(text);

  const blockMathList = [];
  const inlineMathList = [];

  try {
    // 1. 保护块级公式 $$...$$
    let tempText = preprocessedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
      blockMathList.push(math.trim());
      return `BLOCKMATHPLACEHOLDER${blockMathList.length - 1}`;
    });

    // 2. 保护行内公式 $...$
    tempText = tempText.replace(/\$([\s\S]+?)\$/g, (match, math) => {
      inlineMathList.push(math.trim());
      return `INLINEMATHPLACEHOLDER${inlineMathList.length - 1}`;
    });

    // 3. 运行 marked 解析
    let html = marked(tempText);

    // 4. 还原并使用 KaTeX 渲染块级公式
    html = html.replace(/BLOCKMATHPLACEHOLDER(\d+)/g, (match, index) => {
      const idx = parseInt(index, 10);
      const math = blockMathList[idx];
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    });

    // 5. 还原并使用 KaTeX 渲染行内公式
    html = html.replace(/INLINEMATHPLACEHOLDER(\d+)/g, (match, index) => {
      const idx = parseInt(index, 10);
      const math = inlineMathList[idx];
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    });

    return html;
  } catch (e) {
    console.error("Markdown render error:", e);
    return text;
  }
};
</script>

<template>
  <div class="manual-collapse" :class="{ expanded }">
    <button class="collapse-head" @click="expanded = !expanded">
      <div class="collapse-head-left">
        <Icon :name="expanded ? 'chevron-d' : 'chevron-r'" :size="13" />
        <Icon name="rules" :size="14" stroke="var(--brand)" />
        <span class="collapse-title">规则手册原文</span>
      </div>
      <span class="collapse-hint">
        摘自《楼宇调适判定规则手册 v4.0》· {{ rule.ruleCode }} 章节
      </span>
    </button>

    <div v-if="expanded" class="collapse-body">
      <!-- 如果包含元数据，则渲染 Markdown 字段 -->
      <template v-if="hasMeta">
        <div v-for="s in sections" :key="s.title" class="manual-section">
          <div class="manual-section-title">{{ s.title }}</div>
          <div class="markdown-view" v-html="renderMarkdown(s.body)"></div>
        </div>
      </template>
      <div v-else class="manual-empty-meta">
        — 该规则暂无物理原理及数学算式等元数据信息 —
      </div>
    </div>
  </div>
</template>

<style scoped>
.manual-empty-meta {
  padding: 24px;
  text-align: center;
  color: var(--text-3, #94a3b8);
  font-size: 12.5px;
  background: #fafcff;
  border: 1px dashed var(--line, #e2e8f0);
  border-radius: 6px;
  margin-top: 14px;
}
</style>
