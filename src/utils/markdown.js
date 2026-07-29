/* ═══════════════════════════════════════════════════════════════
   markdown.js · Markdown + LaTeX 公式渲染
   ───────────────────────────────────────────────────────────────
   marked 解析 markdown,marked-katex-extension 渲染 $...$ / $$...$$。
   内容为本项目自有/后端可信来源,直接输出 HTML(v-html);若将来接入
   不可信来源,应在此处加 DOMPurify 消毒。
   ═══════════════════════════════════════════════════════════════ */
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";

const marked = new Marked();
marked.use(
  markedKatex({
    throwOnError: false, // 公式语法错误时降级为原文而非抛异常
    nonStandard: true,   // 允许 $ 紧邻中英文/数字(如 t≈26℃ 场景)
  })
);

/** 渲染一段 markdown(含公式)为 HTML 字符串。 */
export function renderMarkdown(src) {
  if (!src) return "";
  return marked.parse(src);
}
