<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailAreaV2 · 判定结果 v2 主栏

   信息顺序（判决书式）：
     结论（常驻）→ 计算过程与图表（展开）→ 建议核查 → 判定依据 → 算法与公式

   叙述文案全部来自 rule-narrative.js 的模板 + resultJSON 的实测值，
   不做任何推断；模板缺失或 calcResult 缺失时整块隐藏，不用占位数。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import * as echarts from "echarts";
import { getRuleNarrative, fillTemplate } from "../../../data/rule-narrative.js";
import {
  parseClustering,
  buildClusterTimeOption,
  buildClusterDistOption,
} from "../../../data/viz-chart-options-v2.js";

const props = defineProps({
  result: { type: Object, default: null },
});
const emit = defineEmits(["open-detail"]);

/* ─── 窗口 ─── */
const windows = computed(() => props.result?.windows || []);
const winIdx = ref(0);
const activeWindow = computed(() => windows.value[winIdx.value] || null);

function parseJson(w) {
  const s = w?.calcResult?.resultJson;
  if (!s) return null;
  try {
    return typeof s === "string" ? JSON.parse(s) : s;
  } catch (e) {
    return null;
  }
}

/* 窗口的判定类别。权威来源是后端 calcResult.category（窗口级），
   取不到时退回规则级 category。
   注意：不要用 window.isTriggered——该字段对 C01 各窗口恒为 false，
   与 calcResult.category 不一致，含义待后端澄清。 */
function winCategory(w) {
  return w?.calcResult?.category || props.result?.category || "";
}
function isWinTriggered(w) {
  return winCategory(w) === "目标调适";
}

const trigCount = computed(() => windows.value.filter(isWinTriggered).length);
const winSummary = computed(() =>
  trigCount.value === windows.value.length && windows.value.length ? "全部触发" : `${trigCount.value} 个触发`
);

/* 切换规则时定位到第一个触发的窗口；没有触发的则回到第一个 */
watch(
  () => props.result?.ruleCode,
  () => {
    const i = windows.value.findIndex(isWinTriggered);
    winIdx.value = i >= 0 ? i : 0;
  },
  { immediate: true }
);

/* ─── resultJSON ─── */
const rawJson = computed(() => parseJson(activeWindow.value));
const visualType = computed(
  () => activeWindow.value?.calcResult?.visualType || props.result?.visualType || ""
);
const isClustering = computed(
  () => visualType.value === "A" || rawJson.value?.type === "clustering"
);
const cluster = computed(() => (isClustering.value ? parseClustering(rawJson.value) : null));

/* ─── 模板取值 ─── */
const meta = computed(() => getRuleNarrative(props.result?.ruleCode));

const vals = computed(() => {
  const w = activeWindow.value;
  const c = cluster.value;
  const j = rawJson.value;
  if (!w || !c || !j) return null;
  const m = j.metrics || {};
  const pct = (v) => (Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(1)}%` : "—");
  const days = j.windowDays?.length || c.days.length;
  return {
    start: fmtDate(w.dateFrom || c.days[0]),
    end: fmtDate(w.dateTo || c.days[c.days.length - 1]),
    days,
    temp: j.temperatureRange?.target ?? "—",
    tempDelta: j.temperatureRange?.delta ?? "—",
    n: c.n,
    mu1: c.mu1,
    mu2: c.mu2,
    sil: Number.isFinite(Number(m.silhouetteScore)) ? Number(m.silhouetteScore).toFixed(2) : "—",
    silThreshold: m.threshold ?? "—",
    delta: pct(m.clusterDiff),
    deltaThreshold: pct(m.diffThreshold),
    _m: m,
  };
});

function fmtDate(s) {
  if (!s) return "—";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? `${p[1]}月${p[2]}日` : s;
}

const triggered = computed(() => isWinTriggered(activeWindow.value));
const activeCategory = computed(() => winCategory(activeWindow.value));
/* t 触发 / n 正常 / o 其他（待核查、配置错误、数据异常、虚拟预测愈合…） */
const tone = computed(() =>
  activeCategory.value === "目标调适" ? "t" : activeCategory.value === "正常" ? "n" : "o"
);

const verdictText = computed(() => {
  if (!meta.value || !vals.value) return "";
  const tpl = triggered.value ? meta.value.narrative.triggered : meta.value.narrative.normal;
  return fillTemplate(tpl, vals.value);
});
const verdictTitle = computed(() =>
  meta.value ? (triggered.value ? meta.value.title.triggered : meta.value.title.normal) : ""
);

/* ─── 判定依据 ─── */
function stepPassed(key, m) {
  if (key === "sil") return Number(m.silhouetteScore) >= Number(m.threshold);
  if (key === "delta") return Number(m.clusterDiff) >= Number(m.diffThreshold);
  if (key === "standby") return m.standbyOk === true;
  return null;
}
const steps = computed(() => {
  if (!meta.value || !vals.value) return [];
  const m = vals.value._m;
  return meta.value.steps.map((s) => ({
    what: s.what,
    sub: fillTemplate(s.sub, vals.value),
    val: fillTemplate(s.val, vals.value),
    req: fillTemplate(s.req, vals.value),
    stated: s.kind === "stated",
    ok: s.kind === "stated" ? null : stepPassed(s.key, m),
  }));
});

/* ─── 折叠状态 ─── */
const open = ref({ chart: true, advice: false, steps: false, algo: false });
function toggle(k) {
  open.value[k] = !open.value[k];
  if (k === "chart" && open.value[k]) nextTick(resize);
}

/* ─── 图表 ─── */
const view = ref("time");
const chartEl = ref(null);
let chart = null;

function render() {
  const c = cluster.value;
  if (!chartEl.value || !c || view.value === "data") return;
  if (!chart) chart = echarts.init(chartEl.value);
  const yName = rawJson.value?.yName || "设备电耗 (kW)";
  chart.setOption(
    view.value === "time" ? buildClusterTimeOption(c, yName) : buildClusterDistOption(c, yName),
    true
  );
}
function resize() {
  chart && chart.resize();
}
function setView(v) {
  view.value = v;
  if (v !== "data") nextTick(render);
}

onMounted(() => {
  nextTick(render);
  window.addEventListener("resize", resize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  chart && chart.dispose();
  chart = null;
});
watch([cluster, view], () => nextTick(render));

const readHint = computed(() => meta.value?.readHint?.[view.value] || "");
</script>

<template>
  <div v-if="!result" class="v2-empty">请选择左侧的一条规则</div>

  <div v-else class="v2-main">
    <!-- 规则头 -->
    <div class="v2-rule-head">
      <span class="v2-rcode mono">{{ result.ruleCode }}</span>
      <h2>{{ result.ruleName || result.ruleCode }}</h2>
      <button class="v2-btn-ghost" @click="emit('open-detail', result.ruleCode)">规则详细</button>
    </div>
    <div class="v2-tag-row">
      <span v-if="result.ruleSeries" class="v2-tag c">{{ result.ruleSeries }}</span>
      <span v-if="result.priority" class="v2-tag high">{{ result.priority }}</span>
      <span class="v2-tag tgt">{{ result.category }}</span>
      <span v-if="windows.length" class="v2-tag hit">触发 {{ trigCount }} / 考核 {{ windows.length }}</span>
      <span v-if="visualType" class="v2-viz-badge">{{ visualType }} 类可视化</span>
    </div>

    <div class="v2-sec">
      <!-- 窗口 -->
      <div v-if="windows.length" class="v2-win-bar">
        <div class="v2-win-tabs">
          <button
            v-for="(w, i) in windows"
            :key="i"
            class="v2-win-tab"
            :class="{ on: i === winIdx }"
            @click="winIdx = i"
          >
            <span
              class="v2-win-mark"
              :class="isWinTriggered(w) ? 't' : winCategory(w) === '正常' ? 'n' : 'o'"
              :title="winCategory(w)"
            >{{ isWinTriggered(w) ? "!" : winCategory(w) === "正常" ? "✓" : "?" }}</span>
            <span>
              <span class="wn">窗口 {{ i + 1 }}</span>
              <span class="wd mono">{{ w.label || `${w.dateFrom} – ${w.dateTo}` }}</span>
            </span>
          </button>
        </div>
        <span class="v2-win-count">{{ windows.length }} 个窗口 · <b>{{ winSummary }}</b></span>
      </div>

      <!-- ⓪ 结论 -->
      <div v-if="verdictText" class="v2-verdict" :class="tone">
        <div class="v2-v-head">
          <span class="v2-v-badge" :class="tone">{{ activeCategory || (triggered ? "触发" : "未触发") }}</span>
          <span class="v2-v-title">{{ verdictTitle }}</span>
          <span class="v2-v-rule mono">{{ result.ruleCode }} · 窗口 {{ winIdx + 1 }}</span>
        </div>
        <div class="v2-v-text" v-html="verdictText" />
      </div>

      <!-- ① 计算过程与图表 -->
      <div class="v2-block" :class="{ open: open.chart }">
        <div class="v2-chart-bar" @click="toggle('chart')">
          <span class="v2-ar">▶</span>
          <span class="v2-cond">计算过程</span>
          <span class="v2-cond-txt">{{ activeWindow?.meteoCondition || "—" }}</span>
          <div v-if="cluster" class="v2-seg" @click.stop>
            <button :class="{ on: view === 'time' }" @click="setView('time')">按时间看</button>
            <button :class="{ on: view === 'dist' }" @click="setView('dist')">看分布</button>
            <button :class="{ on: view === 'data' }" @click="setView('data')">数据</button>
          </div>
        </div>
        <div class="v2-block-b">
          <template v-if="cluster">
            <div v-if="view !== 'data' && readHint" class="v2-read-hint">{{ readHint }}</div>
            <div v-show="view !== 'data'" ref="chartEl" class="v2-chart" />
            <div v-if="view === 'data'" class="v2-tblwrap">
              <table class="v2-dt">
                <thead>
                  <tr><th>#</th><th>时刻</th><th>{{ rawJson?.yName || "设备电耗 (kW)" }}</th><th>归属档位</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in cluster.rows" :key="i">
                    <td class="mono">{{ i + 1 }}</td>
                    <td class="mono">{{ r.day }} {{ r.time }}</td>
                    <td class="mono">{{ r.e.toFixed(2) }}</td>
                    <td :class="r.high ? 'chip-high' : 'chip-low'">{{ r.high ? "高档" : "低档" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <div v-else class="v2-placeholder">
            {{ visualType ? `${visualType} 类图表待实现` : "该窗口暂无计算过程数据" }}
          </div>
        </div>
      </div>

      <!-- ② 建议核查 -->
      <div v-if="triggered" class="v2-block" :class="{ open: open.advice }">
        <div class="v2-block-h" @click="toggle('advice')">
          <span class="v2-ar">▶</span>建议核查<span class="hint">面向现场调适</span>
        </div>
        <div class="v2-block-b">
          <template v-if="meta">
            <ol class="v2-causes">
              <li v-for="(c, i) in meta.causes" :key="i"><span class="n">{{ i + 1 }}</span><span>{{ c }}</span></li>
            </ol>
          </template>
          <div v-else class="v2-placeholder">
            规则 {{ result.ruleCode }} 的核查项尚未录入（rule-narrative.js）
          </div>
        </div>
      </div>

      <!-- ③ 判定依据 -->
      <div v-if="steps.length" class="v2-block" :class="{ open: open.steps }">
        <div class="v2-block-h" @click="toggle('steps')">
          <span class="v2-ar">▶</span>判定依据<span class="hint">实测值与规则要求逐项对照</span>
        </div>
        <div class="v2-block-b">
          <table class="v2-steps">
            <thead><tr><th></th><th>做了什么</th><th>实测</th><th>要求</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in steps" :key="i" :class="{ stated: s.stated }">
                <td class="idx">{{ i + 1 }}</td>
                <td class="what">{{ s.what }}<small>{{ s.sub }}</small></td>
                <td class="val">{{ s.val }}</td>
                <td class="req mono">{{ s.req }}</td>
                <td class="mk" :class="s.stated ? 'na' : s.ok ? 'pass' : 'fail'">
                  {{ s.stated ? "—" : s.ok ? "✓" : "✕" }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="v2-steps-foot" :class="{ n: !triggered }" v-html="triggered ? meta.foot.triggered : meta.foot.normal" />
        </div>
      </div>

      <!-- ④ 算法与公式 -->
      <div v-if="result.judgmentStandard" class="v2-block" :class="{ open: open.algo }">
        <div class="v2-block-h" @click="toggle('algo')">
          <span class="v2-ar">▶</span>算法与判定标准
        </div>
        <div class="v2-block-b">
          <div class="v2-algo">{{ result.judgmentStandard }}</div>
          <div v-if="activeWindow?.calcResult?.formulaSubstitution" class="v2-algo mono sub">
            {{ activeWindow.calcResult.formulaSubstitution }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
