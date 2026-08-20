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
import MarkdownView from "../../common/MarkdownView.vue";
import { getRuleNarrative, fillTemplate } from "../../../data/rule-narrative.js";
import {
  parseClustering,
  buildClusterTimeOption,
  buildClusterDistOption,
  parseSchedule,
  buildScheduleOption,
  parseRegression,
  buildRegressionOption,
  parseDayPair,
  buildDayPairOption,
  parseDistribution,
  buildDistSeriesOption,
  buildDistHistOption,
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

/* ─── 可视化：按 resultJSON.type 分发 ───
   目前实现 clustering(A) 与 schedule(E)。新增类型时在此加一支，
   并同步扩充 vals / stepPassed / VIEWS 三处。 */
const vizKind = computed(() => rawJson.value?.type || "");
const cluster = computed(() => (vizKind.value === "clustering" ? parseClustering(rawJson.value) : null));
const schedule = computed(() => (vizKind.value === "schedule" ? parseSchedule(rawJson.value) : null));
const regression = computed(() => (vizKind.value === "regression" ? parseRegression(rawJson.value) : null));
const dayPair = computed(() => (vizKind.value === "dayPair" ? parseDayPair(rawJson.value) : null));
const distribution = computed(() =>
  vizKind.value === "distribution" ? parseDistribution(rawJson.value) : null
);
const hasViz = computed(
  () => !!(cluster.value || schedule.value || regression.value || dayPair.value || distribution.value)
);

const VIEWS = {
  clustering: [
    { k: "time", label: "按时间看" },
    { k: "dist", label: "看分布" },
    { k: "data", label: "数据" },
  ],
  schedule: [
    { k: "day", label: "按时刻看" },
    { k: "data", label: "数据" },
  ],
  regression: [
    { k: "scat", label: "散点与拟合" },
    { k: "data", label: "数据" },
  ],
  dayPair: [
    /* C03 看涨幅、C02 看降幅，用中性词覆盖两者 */
    { k: "slope", label: "变化对比" },
    { k: "data", label: "数据" },
  ],
  /* 判据只由 max、min 两个点决定，只看直方图会漏掉极值落在哪，故两个图 */
  distribution: [
    { k: "seq", label: "功率序列" },
    { k: "hist", label: "分布" },
    { k: "data", label: "数据" },
  ],
};
const views = computed(() => VIEWS[vizKind.value] || []);

/* ─── 模板取值 ─── */
const meta = computed(() => getRuleNarrative(props.result?.ruleCode));

const pct = (v) => (Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(1)}%` : "—");
const num = (v, d = 2) => (Number.isFinite(Number(v)) ? Number(Number(v).toFixed(d)) : "—");
/* 保留尾零的定点格式，用于同句并列的数值（num 会把 43.0 变成 43） */
const fix1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—");

function fmtDate(s) {
  if (!s) return "—";
  const p = String(s).slice(0, 10).split("-");
  return p.length === 3 ? `${p[1]}月${p[2]}日` : s;
}

const vals = computed(() => {
  const w = activeWindow.value;
  const j = rawJson.value;
  if (!w || !j) return null;
  const m = j.metrics || {};

  if (cluster.value) {
    const c = cluster.value;
    return {
      start: fmtDate(w.dateFrom || c.days[0]),
      end: fmtDate(w.dateTo || c.days[c.days.length - 1]),
      days: j.windowDays?.length || c.days.length,
      temp: j.temperatureRange?.target ?? "—",
      tempDelta: j.temperatureRange?.delta ?? "—",
      n: c.n,
      mu1: c.mu1,
      mu2: c.mu2,
      sil: num(m.silhouetteScore),
      silThreshold: m.threshold ?? "—",
      delta: pct(m.clusterDiff),
      deltaThreshold: pct(m.diffThreshold),
      _m: m,
    };
  }

  if (schedule.value) {
    const d = schedule.value;
    /* E 类单曲线形态（BA-S1 等夜间时段规则） */
    if (d.mode === "single") {
      /* StandbyRatio（AA-S1）：夜间段跨零点，5/8 取数不在图上；
         eDay/10、eNight/8 均为逐时积分的 4 倍，一律不显示，
         改用 parseSchedule 换算出的真实 kW */
      if (d.algo === "StandbyRatio") {
        return {
          date: fmtDate(d.date),
          selectionReason: d.selectionReason,
          dayAvg: fix1(d.dayAvg),
          nightAvg: fix1(d.nightAvg),
          sr: pct(d.sr),
          threshold: pct(d.threshold),
          dayMin: num(d.dayMin),
          dayMax: num(d.dayMax),
          _m: m,
        };
      }
      /* LunchDrop（AA-S3）：判据单边，drop 为负表示午休功率反高于上午。
         模板不支持条件分支，方向措辞在这里定好再塞进句子——
         直接写「降幅 -69.9%」会被读成「降了负数」 */
      if (d.algo === "LunchDrop") {
        const dr = Number(d.drop);
        return {
          date: fmtDate(d.date),
          selectionReason: d.selectionReason,
          pam: fix1(d.pam),
          pl: fix1(d.pl),
          drop: pct(d.drop),
          dropDesc: Number.isFinite(dr)
            ? dr >= 0
              ? `较上午下降 ${(dr * 100).toFixed(1)}%`
              : `较上午反而上升 ${(-dr * 100).toFixed(1)}%`
            : "—",
          threshold: pct(d.threshold),
          dayMin: num(d.dayMin),
          dayMax: num(d.dayMax),
          _m: m,
        };
      }
      /* Precool（BB-S1）：启动时刻 + 温差两条判据，均取后端布尔。
         温差阈值 3.0℃ 不在 payload 里，取自手册原文 */
      if (d.algo === "Precool") {
        return {
          date: fmtDate(d.date),
          selectionReason: d.selectionReason,
          start: d.start,
          startLimit: d.startLimit,
          tdb: fix1(d.tdb),
          tempDiff: fix1(d.tempDiff),
          dayMin: num(d.dayMin),
          dayMax: num(d.dayMax),
          _m: m,
        };
      }
      /* NdrRatio（BC-S1）：两个时段均值之比，没有 pMid / pMax */
      if (d.algo === "NdrRatio") {
        return {
          date: fmtDate(d.date),
          selectionReason: d.selectionReason,
          pLow: num(d.pLow),
          pPeak: num(d.pPeak),
          ndr: pct(d.ndr),
          threshold: pct(d.threshold),
          dayMin: num(d.dayMin),
          dayMax: num(d.dayMax),
          _m: m,
        };
      }
      return {
        date: fmtDate(d.date),
        selectionReason: d.selectionReason,
        pMid: num(d.pMid),
        pMax: num(d.pMax),
        frac: pct(d.frac),
        threshold: pct(d.threshold),
        dayMin: num(d.dayMin),
        dayMax: num(d.dayMax),
        _m: m,
      };
    }
    /* E 类双曲线形态（D05 等日对规则） */
    if (d.algo === "DayPairResidual") {
      /* AA-S2：无温度匹配、无 weekday 标签、无 passed。
         eWork/eOther 实测为逐时积分的 4.0000 倍，不取用。 */
      return {
        wdDate: fmtDate(d.wdDate),
        holDate: fmtDate(d.holDate),
        selectionReason: d.selectionReason,
        /* 「假日」/「周末」取自 selectionReason，两条规则用词不同 */
        holName: d.holName,
        residual: pct(d.residual),
        residualThreshold: pct(d.residualThreshold),
        /* num() 会丢尾零（43.03 → 43），同一句里与 37.3 对不齐，改定点一位 */
        wdPeak: fix1(d.wdPeak),
        wdBase: fix1(d.wdBase),
        holPeak: fix1(d.holPeak),
        holBase: fix1(d.holBase),
        _m: m,
      };
    }
    return {
      wdDate: fmtDate(d.wdDate),
      holDate: fmtDate(d.holDate),
      wdWeek: d.wdWeek,
      holWeek: d.holWeek,
      wdTemp: num(d.wdTemp, 1),
      holTemp: num(d.holTemp, 1),
      tDelta: num(d.tDelta, 2),
      tThreshold: num(d.tThreshold, 1),
      residual: pct(d.residual),
      residualThreshold: pct(d.residualThreshold),
      group: d.group,
      wdPeak: num(d.wdPeak, 1),
      wdBase: num(d.wdBase, 1),
      holPeak: num(d.holPeak, 1),
      holBase: num(d.holBase, 1),
      _m: m,
    };
  }
  if (regression.value) {
    const r = regression.value;
    return {
      start: fmtDate(w.dateFrom),
      end: fmtDate(w.dateTo),
      n: r.n,
      tMin: r.tMin,
      tMax: r.tMax,
      slope: num(r.slope),
      intercept: num(r.intercept),
      formula: r.formula,
      r2: pct(r.r2),
      r2Threshold: pct(r.r2Threshold),
      slopeLimit: num(r.slopeLimit),
      _m: m,
    };
  }
  if (distribution.value) {
    const q = distribution.value;
    return {
      algo: q.algo,
      flat: q.flat,
      /* C04 的选窗前提是湿球日极差，C06 用的是等温窗说明文字 */
      meteoRange: fix1(q.meteoRange),
      meteoRangeThreshold: fix1(q.meteoRangeThreshold),
      meteoUnit: q.meteoUnit,
      dayCount: q.days.length,
      dateFrom: fmtDate(q.days[0]),
      dateTo: fmtDate(q.days[q.days.length - 1]),
      meteoNote: q.meteoNote,
      n: q.n,
      max: fix1(q.max),
      min: fix1(q.min),
      mean: fix1(q.mean),
      std: fix1(q.std),
      cv: pct(q.cv),
      cvThreshold: pct(q.cvThreshold),
      ratio: Number(q.ratio).toFixed(2),
      ratioThreshold: Number(q.ratioThreshold).toFixed(2),
      ratioUpper: q.ratioUpper,
      /* dailyRange / threshold 挂在 meteorology 下、不在 metrics 里，
         stepPassed 只拿得到 _m，这里并进去（与 C02 的 conditionPassed 同理） */
      _m: { ...m, dailyRange: q.meteoRange, rangeThreshold: q.meteoRangeThreshold },
    };
  }
  if (dayPair.value) {
    const p = dayPair.value;
    /* C08（HeatMedianDelta）：判据是绝对值相对差，与 C02/C07 的带符号变化率
       不同，且合计由派生行 totalRow 承载、rows 里只剩分项，故单列一支。 */
    if (p.algo === "HeatMedianDelta") {
      return {
        dayA: fmtDate(p.dayA),
        dayB: fmtDate(p.dayB),
        labelA: p.labelA,
        labelB: p.labelB,
        meteoA: fix1(p.meteoA),
        meteoB: fix1(p.meteoB),
        meteoRise: fix1(Math.abs(Number(p.meteoDelta))),
        meteoUnit: p.meteoUnit,
        coldThreshold: fix1(p.coldThreshold),
        warmThreshold: fix1(p.warmThreshold),
        totalA: num(p.totalA),
        totalB: num(p.totalB),
        deltaM: pct(p.deltaM),
        /* 判据写作「< 20%」，threshold 已是正数，仍取绝对值以防后端改符号 */
        thresholdAbs: pct(Math.abs(Number(p.threshold))),
        nodeCount: p.rows.length,
        /* 分项名与两日数值并成一句，供文案点出冷、热两侧走向相反 */
        nodeList: p.rows
          .map((r) => `${r.name} ${num(r.dayA)} → ${num(r.dayB)} kWh`)
          .join("、"),
        /* conditionPassed 挂在 meteorology 下、不在 metrics 里，
           stepPassed 只拿得到 _m，这里并进去（同 C02） */
        _m: { ...m, conditionPassed: p.meteoPassed },
      };
    }
    /* C02（RejectDelta）与 C07（HeatDelta）结构相同：气象数值 + N 节点 + 合计。
       差别只在判据字段名与符号方向，vals 共用，文案各写各的。 */
    if (p.algo === "RejectDelta" || p.algo === "HeatDelta") {
      return {
        dayA: fmtDate(p.dayA),
        dayB: fmtDate(p.dayB),
        labelA: p.labelA,
        labelB: p.labelB,
        meteoA: fix1(p.meteoA),
        meteoB: fix1(p.meteoB),
        meteoDrop: fix1(Math.abs(Number(p.meteoDelta))),
        meteoThreshold: fix1(Math.abs(Number(p.meteoThreshold))),
        meteoUnit: p.meteoUnit,
        totalA: num(p.totalA),
        totalB: num(p.totalB),
        /* C02 的 deltaEta 为正表示电耗下降（(E_A - E_B)/E_A）；
           C07 的 deltaR 是常规带符号变化率（(E_B - E_A)/E_A），为负才是下降 */
        deltaEta: pct(p.deltaEta),
        deltaR: pct(p.deltaR),
        /* 手册与结论卡按「降幅不足 X」表述，这里给绝对值 */
        thresholdAbs: pct(Math.abs(Number(p.threshold))),
        meteoRise: fix1(Math.abs(Number(p.meteoDelta))),
        threshold: pct(p.threshold),
        nodeCount: p.rows.length,
        /* conditionPassed 挂在 meteorology 下、不在 metrics 里，
           stepPassed 只拿得到 _m，这里并进去 */
        _m: { ...m, conditionPassed: p.meteoPassed },
      };
    }
    const [pump, chiller] = p.rows;
    return {
      dayA: fmtDate(p.dayA),
      dayB: fmtDate(p.dayB),
      /* 升温幅度只有窗口级字符串，resultJson 里没有温度数值 */
      meteo: w.meteoCondition || "—",
      pumpA: num(pump.dayA),
      pumpB: num(pump.dayB),
      chillerA: num(chiller.dayA),
      chillerB: num(chiller.dayB),
      dPump: pct(p.dPump),
      dChiller: pct(p.dChiller),
      /* num() 会丢掉尾部零（R=0 显示成「0」），与要求列的 0.3333 对不齐，
         这里保留定点小数 */
      r: Number.isFinite(Number(p.r)) ? Number(p.r).toFixed(4) : "—",
      threshold: Number.isFinite(Number(p.threshold)) ? Number(p.threshold).toFixed(4) : "—",
      _m: m,
    };
  }
  return null;
});

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
/* title 与 readHint 原本不走 fillTemplate，AA-S2/BA-S2 需要 {holName}
   （「假日」/「周末」取自后端 selectionReason）。既有五条规则的这两个字段
   均无占位符，改动对它们零影响。 */
const verdictTitle = computed(() => {
  if (!meta.value) return "";
  const tpl = triggered.value ? meta.value.title.triggered : meta.value.title.normal;
  return vals.value ? fillTemplate(tpl, vals.value) : tpl;
});

/* ─── 判定依据 ─── */
function stepPassed(key, m) {
  /* A 类 */
  if (key === "sil") return Number(m.silhouetteScore) >= Number(m.threshold);
  if (key === "delta") return Number(m.clusterDiff) >= Number(m.diffThreshold);
  if (key === "standby") return m.standbyOk === true;
  /* E 类 */
  if (key === "tempMatch") {
    const tm = rawJson.value?.windows?.[0]?.temperatureMatch;
    return tm ? Number(tm.delta) <= Number(tm.threshold) : null;
  }
  /* 残留率的比较方向按业态分组而不同（间歇型过高触发、客流型偏低触发），
     不在前端复刻，直接取后端结论：passed=false 即判据满足、指向触发。 */
  /* D05 与 AA-S2 / BA-S2 共用 key「residual」：D05 有 passed（方向随业态变，
     必须取后端布尔），AA-S2 / BA-S2 没有 passed（方向固定，R > 阈值触发）。
     曾误写成两个独立分支,后者被前者遮蔽导致 ✓ 显示为 ✕。 */
  if (key === "residual")
    return m.passed !== undefined
      ? m.passed === false
      : Number(m.residual) > Number(m.threshold);
  if (key === "frac") return Number(m.frac) > Number(m.threshold);
  if (key === "ndr") return Number(m.ndr) > Number(m.threshold);
  /* B 类。要求列写的是合格条件，所以 ✓ 表示达标；
     该规则是"有一项不达标即触发"，结论由 foot 给出。 */
  if (key === "r2") return m.r2Passed === true;
  /* C02：两条判据均取后端。气象前提用 conditionPassed；
     Δη 用 passed（false = 触发），与 D05 / C03 同语义。
     ⚠ 不在前端比大小——手册的 Δη ≥ -5% 与其自身 Δη 定义方向相反，
     自己比会得出与后端相反的结论。 */
  if (key === "meteo") return m.conditionPassed === true;
  if (key === "eta") return m.passed === false;
  /* C07：与 C02 同为后端布尔，但判据字段与符号方向不同，单列以免混淆 */
  if (key === "dr") return m.passed === false;
  /* C06：双边判据 1.30 < R < 100，上界用于滤传感器故障。
     后端字段名 maxMeanRatio 装的是 max/min（见 parseDistribution 注释）。 */
  if (key === "ratio") {
    const r = Number(m.maxMeanRatio);
    return r > Number(m.ratioThreshold) && r < 100;
  }
  /* C04：两条判据同为「小于阈值才触发」，方向与 C06 相反；
     另有选窗前提湿球日极差（无 conditionPassed 布尔，直接比）。
     三个 key 与 C06 的 ratio 分开，避免同名分支互相遮蔽。 */
  if (key === "cvLow") return Number(m.cv) < Number(m.cvThreshold);
  if (key === "rMaxMean") return Number(m.maxMeanRatio) < Number(m.ratioThreshold);
  if (key === "meteoRange") return Number(m.dailyRange) >= Number(m.rangeThreshold);
  /* AA-S3：单边判据，drop < 阈值即触发（含 drop 为负的情形） */
  if (key === "lunchDrop") return Number(m.drop) < Number(m.threshold);
  /* BB-S1：两条判据均为后端布尔。⚠ resultMd 里第 2 行的 ✅/❌ 实测三窗口
     错了两个（mild=False 标 ✅、mild=True 标 ❌，且两个 False 窗口标法不一致），
     判决本身正确（early && mild）。故只信布尔，不看 resultMd 的表 */
  if (key === "early") return m.early === true;
  if (key === "mild") return m.mild === true;
  /* AA-S1：同样无 passed，方向固定（SR > 阈值触发） */
  if (key === "sr") return Number(m.sr) > Number(m.threshold);
  if (key === "slope") return m.slopePassed === true;
  /* C03：反向判据（R < 1/3 触发），且 R 可能为负。照 D05 取后端布尔，
     passed === false 即触发；不在前端比大小。 */
  if (key === "r") return m.passed === false;
  /* C08：ΔM < 20% 触发（差距小才是缺陷），是反向判据。后端给了 passed，
     两栋楼逐窗口核对过：passed=false ↔ category=目标调适、
     passed=true ↔ category=正常。照约定取布尔，不在前端比大小。 */
  if (key === "dm") return m.passed === false;
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
watch(views, (list) => {
  if (list.length && !list.some((v) => v.k === view.value)) view.value = list[0].k;
}, { immediate: true });
const chartEl = ref(null);
let chart = null;

function render() {
  if (!chartEl.value || view.value === "data" || !hasViz.value) return;
  if (!chart) chart = echarts.init(chartEl.value);
  let option = null;
  if (cluster.value) {
    const yName = rawJson.value?.yName || "设备电耗 (kW)";
    option = view.value === "dist"
      ? buildClusterDistOption(cluster.value, yName)
      : buildClusterTimeOption(cluster.value, yName);
  } else if (schedule.value) {
    /* BC-S1 喂的是冷冻泵 + 冷却泵（requiredNodeTypes = U2A01,U2A02），
       不是空调系统总电耗，纵轴名不能沿用默认值 */
    option = buildScheduleOption(
      schedule.value,
      schedule.value.algo === "NdrRatio"
        ? "冷冻泵 + 冷却泵功率 (kW)"
        : schedule.value.algo === "StandbyRatio"
        ? "冷冻泵、冷却泵与全空气机组功率 (kW)"
        : schedule.value.algo === "Precool"
        ? "冷热站、冷冻泵与冷却泵功率 (kW)"
        : schedule.value.algo === "LunchDrop"
        ? "全空气机组与新风机组功率 (kW)"
        : undefined
    );
  } else if (regression.value) {
    option = buildRegressionOption(regression.value);
  } else if (dayPair.value) {
    option = buildDayPairOption(dayPair.value);
  } else if (distribution.value) {
    option = view.value === "hist"
      ? buildDistHistOption(distribution.value)
      : buildDistSeriesOption(distribution.value);
  }
  if (option) chart.setOption(option, true);
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
/* 监听 rawJson 而不是 cluster/schedule：切换窗口时 rawJson 必然变化，
   而某一类的解析结果在另一类下恒为 null，只盯其中一个会漏掉切换。 */
watch([rawJson, view], () => nextTick(render));

const readHint = computed(() => {
  const tpl = meta.value?.readHint?.[view.value] || "";
  return vals.value ? fillTemplate(tpl, vals.value) : tpl;
});
/* 建议核查。两种写法：
   - 字符串数组：该规则只有一种故障模式，恒显示
   - 分组数组：仅显示 metrics[whenFalse] === false 的那些组，
     避免给 R² 不达标的楼推送"新风阀开度过大"这类无关方向 */
const causeGroups = computed(() => {
  const c = meta.value?.causes;
  if (!Array.isArray(c) || !c.length) return [];
  if (typeof c[0] === "string") return [{ title: "", items: c }];
  const m = rawJson.value?.metrics || {};
  return c.filter((g) => m[g.whenFalse] === false);
});

const algoMd = computed(() => activeWindow.value?.calcResult?.resultMd || "");
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
          <div v-if="views.length" class="v2-seg" @click.stop>
            <button
              v-for="v in views"
              :key="v.k"
              :class="{ on: view === v.k }"
              @click="setView(v.k)"
            >{{ v.label }}</button>
          </div>
        </div>
        <div class="v2-block-b">
          <template v-if="hasViz">
            <div v-if="view !== 'data' && readHint" class="v2-read-hint">{{ readHint }}</div>
            <div v-show="view !== 'data'" ref="chartEl" class="v2-chart" />

            <!-- A 类：聚类采样点 -->
            <div v-if="view === 'data' && cluster" class="v2-tblwrap">
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

            <!-- E 类：逐时功率（单曲线 / 工作日对照两种形态） -->
            <div v-if="view === 'data' && schedule" class="v2-tblwrap">
              <table v-if="schedule.mode === 'pair'" class="v2-dt">
                <thead>
                  <tr>
                    <th>时刻</th>
                    <th>工作日 {{ schedule.wdDate.slice(5) }}</th>
                    <th>节假日 {{ schedule.holDate.slice(5) }}</th>
                    <th>差值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in schedule.hours" :key="h">
                    <td class="mono">{{ h }}</td>
                    <td class="mono">{{ schedule.workday[i] }}</td>
                    <td class="mono">{{ schedule.holiday[i] }}</td>
                    <td class="mono">{{ (schedule.workday[i] - schedule.holiday[i]).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <table v-else class="v2-dt">
                <thead>
                  <tr><th>时刻</th><th>{{ schedule.date.slice(5) }} 逐时功率 (kW)</th><th>是否在取数时段</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in schedule.hours" :key="h">
                    <td class="mono">{{ h }}</td>
                    <td class="mono">{{ schedule.workday[i] }}</td>
                    <td :class="i <= 4 || i === 23 ? 'chip-high' : ''">{{ i <= 4 || i === 23 ? "23:00–04:00" : "—" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- B 类：逐时（温度，电耗）样本 -->
            <div v-if="view === 'data' && regression" class="v2-tblwrap">
              <table class="v2-dt">
                <thead>
                  <tr><th>#</th><th>室外干球温度 (°C)</th><th>空调系统总电耗 (kW)</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in regression.rows" :key="i">
                    <td class="mono">{{ i + 1 }}</td>
                    <td class="mono">{{ r[0] }}</td>
                    <td class="mono">{{ r[1] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- D 类：等温窗口功率分布 -->
            <div v-if="view === 'data' && distribution" class="v2-tblwrap">
              <table class="v2-dt">
                <thead>
                  <tr><th>指标</th><th>值</th></tr>
                </thead>
                <tbody>
                  <tr><td>样本数 n</td><td class="mono">{{ distribution.n }}</td></tr>
                  <tr><td>最大功率 max</td><td class="mono">{{ distribution.max }} kW</td></tr>
                  <tr><td>最小功率 min</td><td class="mono">{{ distribution.min }} kW</td></tr>
                  <tr><td>离散比 max/min</td><td class="mono">{{ Number(distribution.ratio).toFixed(4) }}</td></tr>
                  <tr><td>均值 μ</td><td class="mono">{{ Number(distribution.mean).toFixed(2) }} kW</td></tr>
                  <tr><td>标准差 σ</td><td class="mono">{{ Number(distribution.std).toFixed(2) }}</td></tr>
                  <tr><td>变异系数 CV</td><td class="mono">{{ Number(distribution.cv).toFixed(4) }}</td></tr>
                </tbody>
              </table>
            </div>

            <!-- C 类：升温日对的两个节点日总电耗 -->
            <div v-if="view === 'data' && dayPair" class="v2-tblwrap">
              <table class="v2-dt">
                <thead>
                  <tr>
                    <th>节点</th>
                    <th>{{ dayPair.labelA }} {{ dayPair.dayA }} ({{ dayPair.unit }})</th>
                    <th>{{ dayPair.labelB }} {{ dayPair.dayB }} ({{ dayPair.unit }})</th>
                    <th>变化</th>
                    <th>变化率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in dayPair.rows" :key="r.name">
                    <td>{{ r.name }}</td>
                    <td class="mono">{{ r.dayA }}</td>
                    <td class="mono">{{ r.dayB }}</td>
                    <td class="mono">{{ r.delta > 0 ? "+" : "" }}{{ r.delta }}</td>
                    <!-- C08 的 U2A01 实测有极寒日为 0 的窗口，rate 是 NaN，
                         原样 toFixed 会在表里显示「NaN%」 -->
                    <td class="mono">
                      {{ Number.isFinite(r.rate) ? (r.rate * 100).toFixed(1) + "%" : "—" }}
                    </td>
                  </tr>
                  <tr v-if="Number.isFinite(dayPair.totalA)">
                    <td><b>合计</b></td>
                    <td class="mono"><b>{{ dayPair.totalA }}</b></td>
                    <td class="mono"><b>{{ dayPair.totalB }}</b></td>
                    <td class="mono"><b>{{ (dayPair.totalB - dayPair.totalA).toFixed(2) }}</b></td>
                    <td class="mono"><b>{{ (dayPair.totalRate * 100).toFixed(1) }}%</b></td>
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
          <template v-if="causeGroups.length">
            <div v-for="(g, gi) in causeGroups" :key="gi" class="v2-cause-grp">
              <div v-if="g.title" class="v2-cause-title">{{ g.title }}</div>
              <ol class="v2-causes">
                <li v-for="(c, i) in g.items" :key="i"><span class="n">{{ i + 1 }}</span><span>{{ c }}</span></li>
              </ol>
            </div>
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

      <!-- ④ 算法与判定标准 —— 骨架保留，内容待接入 -->
      <div class="v2-block" :class="{ open: open.algo }">
        <div class="v2-block-h" @click="toggle('algo')">
          <span class="v2-ar">▶</span>算法与判定标准
        </div>
        <div class="v2-block-b">
          <MarkdownView v-if="algoMd" :source="algoMd" class="v2-algo-md" />
          <div v-else class="v2-placeholder">该窗口暂无算法说明</div>
        </div>
      </div>
    </div>
  </div>
</template>
