/* 把 RuleDetailAreaV2.vue 里的 vals 与 stepPassed 原样切出来，
   包一层 shim 后当模块用。目的是让验证跑的是**组件里真正那份代码**，
   而不是在测试里重写一遍——判定逻辑被复刻两份正是 residual 那次事故的成因。

   切法依赖三个锚点，改动组件时若挪动了它们，这里会直接抛错而不是静默失效。 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const VUE = path.join(ROOT, "src/components/result/v2/RuleDetailAreaV2.vue");

function slice(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) throw new Error(`锚点未找到：${startMark}`);
  const j = src.indexOf(endMark, i + startMark.length);
  if (j < 0) throw new Error(`结束锚点未找到：${endMark}（起点 ${startMark}）`);
  return src.slice(i, j + endMark.length);
}

export function build() {
  const src = fs.readFileSync(VUE, "utf8");

  const helpers = slice(src, "const pct = (v) =>", "return p.length === 3 ? `${p[1]}月${p[2]}日` : s;\n}");
  const valsBody = slice(src, "const vals = computed(() => {", "\n});");
  const stepFn = slice(src, "function stepPassed(key, m) {", "\n  return null;\n}");

  const inner = valsBody
    .replace("const vals = computed(() => {", "")
    .replace(/\n}\);$/, "");

  const mod = `
import {
  parseClustering, parseSchedule, parseRegression, parseDayPair, parseDistribution,
} from "../../../src/data/viz-chart-options-v2.js";

${helpers}

/* vals 与 stepPassed 都以 xxx.value 访问模块级 ref，这里用 {value} 壳子喂进去，
   切出来的函数体因此可以一字不改地运行。 */
export function computeVals(raw, win) {
  const activeWindow = { value: win };
  const rawJson = { value: raw };
  const k = raw?.type || "";
  const cluster = { value: k === "clustering" ? parseClustering(raw) : null };
  const schedule = { value: k === "schedule" ? parseSchedule(raw) : null };
  const regression = { value: k === "regression" ? parseRegression(raw) : null };
  const dayPair = { value: k === "dayPair" ? parseDayPair(raw) : null };
  const distribution = { value: k === "distribution" ? parseDistribution(raw) : null };
  ${inner}
}

export function makeStepPassed(raw) {
  const rawJson = { value: raw };
  ${stepFn}
  return stepPassed;
}
`;

  const out = path.join(ROOT, "scripts/verify/.build");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "logic.mjs"), mod);
  return path.join(out, "logic.mjs");
}

if (import.meta.filename === process.argv[1]) console.log("已生成", build());
