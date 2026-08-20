/* 第五节验证的第 2、3、4 步。第 1 步（手算复现 metrics）是逐规则的数学，
   留在各规则接入时手工做，不在这里假装自动化。

   用法：
     node scripts/verify/run.mjs            跑全部 fixture
     node scripts/verify/run.mjs --update   重写快照（确认改动是预期的之后再用）

   fixture 格式见 fixtures/README.md。 */
import fs from "node:fs";
import path from "node:path";
import { build } from "./extract.mjs";
import { getRuleNarrative, fillTemplate } from "../../src/data/rule-narrative.js";
import {
  buildDayPairOption, parseDayPair, buildScheduleOption, parseSchedule,
} from "../../src/data/viz-chart-options-v2.js";

const DIR = import.meta.dirname;
const FIX = path.join(DIR, "fixtures");
const SNAP = path.join(DIR, "snapshots");
const UPDATE = process.argv.includes("--update");

const { computeVals, makeStepPassed } = await import(build());

let pass = 0;
const fails = [];
const fail = (f, msg) => fails.push(`${f}: ${msg}`);

for (const file of fs.readdirSync(FIX).filter((f) => f.endsWith(".json")).sort()) {
  const fx = JSON.parse(fs.readFileSync(path.join(FIX, file), "utf8"));
  const win = fx.window;
  const raw = JSON.parse(win.calcResult.resultJson);
  const triggered = win.calcResult.category !== "正常";
  const meta = getRuleNarrative(fx.ruleCode);

  if (!meta) { fail(file, `getRuleNarrative("${fx.ruleCode}") 返回空——常量没注册`); continue; }

  const vals = computeVals(raw, win);
  if (!vals) { fail(file, "vals 为 null——vizKind 没有对应分支"); continue; }

  /* 第三态「未判定」。这段分支规则与 RuleDetailAreaV2.vue 的 branch computed
     必须一致——那边是 computed 不便切片，此处镜像，改动时两处同步。
     不变量：vals 给了 _gate，模板就必须有 undetermined 分支。 */
  const und = !!vals._gate && !!meta.narrative?.undetermined;
  if (vals._gate && !meta.narrative?.undetermined) {
    fail(file, "vals 带 _gate 但模板没有 undetermined 分支——会退回 normal，把「未判定」说成「已检查」");
  }
  if (und && triggered) fail(file, "既是门控又是触发，语义冲突");

  /* ② 模板渲染：所有占位符都被填上，且没有渲染出 undefined / NaN */
  const branch = triggered ? "triggered" : und ? "undetermined" : "normal";
  const texts = [
    ["narrative", meta.narrative?.[branch]],
    ["title", meta.title?.[branch]],
    ["foot", meta.foot?.[branch]],
    ...(meta.steps || []).flatMap((s, i) => [
      [`steps[${i}].sub`, s.sub], [`steps[${i}].val`, s.val], [`steps[${i}].req`, s.req],
    ]),
    ...Object.entries(meta.readHint || {}).map(([k, v]) => [`readHint.${k}`, v]),
  ];
  for (const [where, tpl] of texts) {
    if (!tpl) continue;
    const outText = fillTemplate(tpl, vals);
    const left = outText.match(/\{[a-zA-Z_][\w]*\}/g);
    if (left) fail(file, `${where} 占位符未填：${[...new Set(left)].join(",")}`);
    if (/undefined|NaN/.test(outText)) fail(file, `${where} 渲染出 undefined/NaN：${outText.slice(0, 90)}`);
  }

  /* ③ 判定一致性：带 key 的判据步骤不得为 null，且与 category 同向 */
  const sp = makeStepPassed(raw);
  const keyed = (meta.steps || []).filter((s) => s.kind === "test" && s.key);
  if (!keyed.length) fail(file, "没有任何带 key 的判据步骤");
  const results = keyed.map((s) => [s.key, sp(s.key, vals._m || raw.metrics || {})]);
  for (const [k, v] of results) {
    /* null 有两种含义：未判定（合法，仅限门控窗口）与 key 没接上（缺陷）。
       非门控窗口出现 null 一律算缺陷——judgment 表会把它渲染成「—」，
       与「已检查」肉眼不可分。 */
    if (v === null && !und) fail(file, `stepPassed("${k}") 返回 null——key 没接上`);
  }
  if (und) {
    /* 门控窗口：判据必须全部「未判定」，不得给出 true/false 的结论 */
    const decided = results.filter(([, v]) => v !== null);
    if (decided.length) {
      fail(file, `门控窗口却给出了判据结论：${JSON.stringify(decided)}`);
    }
  } else {
    const allTrue = results.every(([, v]) => v === true);
    if (allTrue !== triggered) {
      fail(file, `判定不一致：category=${win.calcResult.category} 但判据为 ${JSON.stringify(results)}`);
    }
  }

  /* ④ 快照：解析结果 + 图上真正画出的线，逐值比对 */
  /* ④ 快照：解析结果 + 渲染后的文案 + 图上真正画出的线，逐值比对。
     文案必须进快照——vals 没变而模板措辞改了的情况，其余三步都发现不了。 */
  const snapObj = {
    vals,
    steps: results,
    texts: Object.fromEntries(texts.filter(([, t]) => t).map(([w, t]) => [w, fillTemplate(t, vals)])),
  };
  if (raw.type === "dayPair") {
    const d = parseDayPair(raw);
    const opt = buildDayPairOption(d);
    snapObj.chart = {
      yAxis: opt.yAxis?.name, min: opt.yAxis?.min, max: opt.yAxis?.max,
      series: opt.series?.map((s) => ({ name: s.name, data: s.data })),
    };
    /* rows 也要进快照：数据页签直接渲染 rows[].delta / rate，
       而这两个字段既不在 vals 里也不在图上，只靠上面三项抓不到
       （实测把 D04 的 delta 改回后端原值——符号是反的——全部照样通过）。 */
    snapObj.rows = d.rows?.map((r) => ({ name: r.name, dayA: r.dayA, dayB: r.dayB, delta: r.delta, rate: r.rate }));
  }
  /* E 类同样要覆盖：图例名与曲线归属只在 option.series 里，vals 抓不到。
     BF-S1 的两条曲线若标反（把「高负荷」贴到低负荷线上），
     只看 vals 完全发现不了。 */
  if (raw.type === "schedule") {
    const d = parseSchedule(raw);
    const opt = buildScheduleOption(d);
    snapObj.chart = {
      series: opt.series?.map((s) => ({ name: s.name, head: s.data?.slice(0, 3) })),
      wdName: d.wdName, holName: d.holName, wdDate: d.wdDate, holDate: d.holDate,
    };
  }
  const snapFile = path.join(SNAP, file);
  const cur = JSON.stringify(snapObj, null, 2);
  fs.mkdirSync(SNAP, { recursive: true });
  if (UPDATE || !fs.existsSync(snapFile)) {
    fs.writeFileSync(snapFile, cur);
    if (!UPDATE) console.log(`  · ${file} 新建快照`);
  } else if (fs.readFileSync(snapFile, "utf8") !== cur) {
    fail(file, "快照不符——若改动是预期的，用 --update 重写");
  }

  if (!fails.some((f) => f.startsWith(file))) pass++;
}

/* key 边界用例：单独喂构造的 metrics，锁住比较方向与边界 */
const cases = JSON.parse(fs.readFileSync(path.join(DIR, "cases.json"), "utf8"));
const spBare = makeStepPassed({});
let cPass = 0;
for (const c of cases) {
  const got = spBare(c.key, c.m);
  if (got !== c.expect) fails.push(`cases[${c.name}]: stepPassed("${c.key}") = ${got}，期望 ${c.expect}`);
  else cPass++;
}

console.log(`\nfixture ${pass}/${fs.readdirSync(FIX).filter((f) => f.endsWith(".json")).length} 通过`);
console.log(`边界用例 ${cPass}/${cases.length} 通过`);
if (fails.length) {
  console.log("\n失败：");
  fails.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("全部通过");
