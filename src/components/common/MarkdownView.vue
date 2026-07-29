<script setup>
/* ═══════════════════════════════════════════════════════════════
   MarkdownView · 渲染一段 markdown(含 LaTeX 公式)
   通用组件:传入 source(md 字符串)即可;1.2 规则详情页等处均可复用。
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import { renderMarkdown } from "../../utils/markdown.js";
import "katex/dist/katex.min.css";
import "../../assets/styles/markdown.css";

const props = defineProps({
  source: { type: String, default: "" },
});

const html = computed(() => renderMarkdown(props.source));
</script>

<template>
  <!-- 内容来自可信来源(mock/后端),v-html 渲染 -->
  <div class="markdown-view" v-html="html"></div>
</template>
