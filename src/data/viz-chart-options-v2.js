/* ═══════════════════════════════════════════════════════════════
   判定结果 v2 · 图表 option builder

   与旧版 viz-chart-options.js 的区别：
   - 旧版 A 类把 hour 线性映射成温度画散点。C01 的等温窗口内所有点
     温度恒等（后端 temperatureRange.target 是单值），那条横轴是构造
     出来的，没有物理含义。本文件不再这么画。
   - 新版 A 类提供两个视图：
       time  三日日内曲线叠放（时刻为横轴）
       dist  一维分布（电耗为横轴，时刻仅用于把点摊开）

   目前只实现 A 类。B/C/D/E 各类等拿到真实 resultJSON 后再加。
   ═══════════════════════════════════════════════════════════════ */

const COLOR = {
  low: "#8b7ff0",
  high: "#f59a52",
  highText: "#e08b2f",
  axis: "#97a4c0",
  axisName: "#6a7da3",
  line: "rgba(60,110,200,.2)",
  split: "rgba(60,110,200,.09)",
  days: ["#2f7fff", "#18a572", "#e54e6e"],
};

/* 解析 A 类 resultJSON → 画图与叙述都用这一份结果，保证两者不打架 */
export function parseClustering(raw) {
  if (!raw) return null;
  const pts = raw.dataPoints || [];
  if (!pts.length) return null;

  const mu1 = Number(raw.clusters?.c1?.center);
  const mu2 = Number(raw.clusters?.c2?.center);
  if (!Number.isFinite(mu1) || !Number.isFinite(mu2)) return null;

  /* 着色边界取两簇中点。对已核对的真实数据，该边界切出的高档点数
     与后端 clusters.c2.points 的条数一致。 */
  const mid = (mu1 + mu2) / 2;

  const rows = pts
    .map((p) => {
      const e = Number(p.energy);
      if (!Number.isFinite(e)) return null;
      const [day, time] = String(p.hour || "").split("T");
      if (!day || !time) return null;
      const [hh, mm] = time.split(":").map(Number);
      return { day, time: time.slice(0, 5), hh, mm, e, high: e > mid };
    })
    .filter(Boolean);

  if (!rows.length) return null;

  const days = [...new Set(rows.map((r) => r.day))];
  const slots = [...new Set(rows.map((r) => r.time))].sort();

  return {
    rows,
    days,
    slots,
    mu1: +mu1.toFixed(2),
    mu2: +mu2.toFixed(2),
    mid,
    n: rows.length,
    lowCount: rows.filter((r) => !r.high).length,
    highCount: rows.filter((r) => r.high).length,
  };
}

function yBounds(d) {
  const es = d.rows.map((r) => r.e);
  return { min: Math.max(0, Math.floor(Math.min(...es) - 8)), max: Math.ceil(Math.max(...es) + 8) };
}

function centreLines(d) {
  return {
    silent: true,
    symbol: "none",
    label: { fontSize: 11, position: "insideEndTop" },
    data: [
      {
        yAxis: d.mu1,
        lineStyle: { color: COLOR.low, type: "dashed", width: 1 },
        label: { formatter: `低档平均 ${d.mu1} kW`, color: COLOR.low },
      },
      {
        yAxis: d.mu2,
        lineStyle: { color: COLOR.high, type: "dashed", width: 1 },
        label: { formatter: `高档平均 ${d.mu2} kW`, color: COLOR.highText },
      },
    ],
  };
}

/* ── 视图一：三日日内曲线叠放 ── */
export function buildClusterTimeOption(d, yName = "设备电耗 (kW)") {
  const { min, max } = yBounds(d);
  const byDay = {};
  d.rows.forEach((r) => {
    (byDay[r.day] = byDay[r.day] || {})[r.time] = r.e;
  });

  const series = d.days.map((day, i) => ({
    name: day.slice(5).replace("-", "/"),
    type: "line",
    symbol: "circle",
    symbolSize: 4,
    connectNulls: true,
    data: d.slots.map((s) => (byDay[day][s] === undefined ? null : byDay[day][s])),
    lineStyle: { width: 1.8, color: COLOR.days[i % COLOR.days.length] },
    itemStyle: { color: COLOR.days[i % COLOR.days.length] },
    emphasis: { focus: "series" },
  }));
  if (series.length) series[0].markLine = centreLines(d);

  return {
    grid: { left: 66, right: 26, top: 46, bottom: 52 },
    legend: { top: 6, right: 10, itemWidth: 14, itemHeight: 2, textStyle: { color: COLOR.axisName, fontSize: 11 } },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      axisPointer: { type: "line", lineStyle: { color: "rgba(60,110,200,.25)" } },
    },
    xAxis: {
      type: "category",
      data: d.slots,
      boundaryGap: false,
      name: "时刻（多日叠放）",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: {
        color: COLOR.axis,
        fontSize: 10,
        interval: (i, v) => v.endsWith(":00") && Number(v.slice(0, 2)) % 2 === 1,
      },
      splitLine: { show: true, lineStyle: { color: "rgba(60,110,200,.05)" } },
    },
    yAxis: {
      type: "value",
      name: yName,
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: COLOR.split } },
    },
    series,
  };
}

/* ── 视图二：一维分布（横轴电耗，纵轴时刻仅用于摊开）── */
export function buildClusterDistOption(d, xName = "设备电耗 (kW)") {
  const { min, max } = yBounds(d);
  const slotIndex = Object.fromEntries(d.slots.map((s, i) => [s, i]));
  const low = [];
  const high = [];
  d.rows.forEach((r) => {
    (r.high ? high : low).push([r.e, slotIndex[r.time], `${r.day} ${r.time}`]);
  });

  const markCentre = (value, color, text) => ({
    silent: true,
    symbol: "none",
    label: { fontSize: 11, position: "insideEndTop" },
    data: [{ xAxis: value, lineStyle: { color, type: "dashed", width: 1 }, label: { formatter: text, color } }],
  });

  return {
    grid: { left: 66, right: 26, top: 46, bottom: 52 },
    legend: { top: 6, right: 10, itemWidth: 9, itemHeight: 9, textStyle: { color: COLOR.axisName, fontSize: 11 } },
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      formatter: (p) => `${p.data[2]}<br/>设备电耗 <b>${p.data[0].toFixed(2)} kW</b><br/>归属 ${p.seriesName}`,
    },
    xAxis: {
      type: "value",
      name: xName,
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(60,110,200,.06)" } },
    },
    yAxis: {
      type: "value",
      name: "时刻",
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min: -1,
      max: d.slots.length,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLOR.axis,
        fontSize: 11,
        formatter: (v) => {
          const s = d.slots[v];
          return s && s.endsWith(":00") ? s : "";
        },
      },
      splitLine: { lineStyle: { color: "rgba(60,110,200,.06)" } },
    },
    series: [
      {
        name: `低档簇（${d.lowCount} 点）`,
        type: "scatter",
        symbolSize: 8,
        data: low,
        itemStyle: { color: COLOR.low, opacity: 0.75 },
        markLine: markCentre(d.mu1, COLOR.low, `低档簇心 ${d.mu1}`),
      },
      {
        name: `高档簇（${d.highCount} 点）`,
        type: "scatter",
        symbolSize: 8,
        data: high,
        itemStyle: { color: COLOR.high, opacity: 0.85 },
        markLine: markCentre(d.mu2, COLOR.highText, `高档簇心 ${d.mu2}`),
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════
   B 类 · 能学签名回归（regression）
   D02 等规则用：制冷季逐时的（干球温度，空调电耗）散点 + OLS 拟合直线。
   这里的横轴是逐点实测温度，与 A 类不同——A 类的等温窗口内温度恒等，
   没有横轴信息量；B 类的温度是自变量本身，必须照实画。
   ═══════════════════════════════════════════════════════════════ */

export function parseRegression(raw) {
  if (!raw) return null;
  const pts = raw.dataPoints;
  const reg = raw.regression;
  if (!Array.isArray(pts) || !pts.length || !reg) return null;

  const rows = pts
    .map((p) => {
      const t = Number(p.t_db);
      const e = Number(p.energy);
      return Number.isFinite(t) && Number.isFinite(e) ? [t, e] : null;
    })
    .filter(Boolean);
  if (!rows.length) return null;

  const m = raw.metrics || {};
  const [tMin, tMax] = reg.temperatureRange || [
    Math.min(...rows.map((r) => r[0])),
    Math.max(...rows.map((r) => r[0])),
  ];
  const k = Number(reg.slope_k);
  const b = Number(reg.intercept_b);

  return {
    rows,
    slope: k,
    intercept: b,
    r2: Number(reg.rSquared),
    n: reg.n ?? rows.length,
    tMin,
    tMax,
    formula: reg.formula || "",
    /* 拟合直线只在样本温度区间内画，不外推 */
    line: [
      [tMin, k * tMin + b],
      [tMax, k * tMax + b],
    ],
    r2Threshold: m.rSquaredThreshold,
    slopeLimit: m.slopeLimit,
    r2Passed: m.r2Passed,
    slopePassed: m.slopePassed,
    eMin: Math.min(...rows.map((r) => r[1])),
    eMax: Math.max(...rows.map((r) => r[1])),
  };
}

export function buildRegressionOption(d, yName = "空调系统总电耗 (kW)") {
  /* 纵轴下界要能容下拟合直线的起点——若直线在低温端落到负值，
     那本身就是拟合质量的信号，不做裁剪。 */
  const lineLow = Math.min(d.line[0][1], d.line[1][1]);
  const min = Math.floor(Math.min(d.eMin, lineLow, 0) - 4);
  const max = Math.ceil(d.eMax * 1.06);

  return {
    grid: { left: 66, right: 26, top: 46, bottom: 52 },
    legend: {
      top: 6,
      right: 10,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: COLOR.axisName, fontSize: 11 },
      data: ["逐时实测", "回归拟合线"],
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      formatter: (p) =>
        p.seriesName === "逐时实测"
          ? `干球温度 <b>${p.data[0]} °C</b><br/>空调电耗 <b>${p.data[1]} kW</b>`
          : `拟合线：${d.formula}`,
    },
    xAxis: {
      type: "value",
      name: "室外干球温度 (°C)",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min: Math.floor(d.tMin - 0.5),
      max: Math.ceil(d.tMax + 0.5),
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(60,110,200,.06)" } },
    },
    yAxis: {
      type: "value",
      name: yName,
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: COLOR.split } },
    },
    series: [
      {
        name: "逐时实测",
        type: "scatter",
        data: d.rows,
        symbolSize: 4,
        large: true,
        largeThreshold: 1000,
        itemStyle: { color: "#2f7fff", opacity: 0.3 },
      },
      {
        name: "回归拟合线",
        type: "line",
        data: d.line,
        symbol: "none",
        lineStyle: { color: "#e54e6e", width: 2 },
        z: 5,
      },
    ],
  };
}

/* ═══════════════════════════════════════════════════════════════
   E 类 · 作息日对（schedule）
   D05 等规则用：同温的工作日 / 节假日各一条 24 小时曲线，
   两条曲线下的面积之比就是空载残留率 R，所以用面积图，
   让 R 直接成为图形本身，而不是另贴一个数字。
   ═══════════════════════════════════════════════════════════════ */

const WEEK_CN = {
  Monday: "周一", Tuesday: "周二", Wednesday: "周三", Thursday: "周四",
  Friday: "周五", Saturday: "周六", Sunday: "周日",
};
const GROUP_CN = {
  Intermittent: "间歇运营",
  Traffic: "客流型",
  Continuous: "24 小时连续型",
};

export function parseSchedule(raw) {
  if (!raw) return null;
  const wd = raw.hourlyProfiles?.workday;
  if (!Array.isArray(wd) || !wd.length) return null;
  const hol = raw.hourlyProfiles?.holiday;
  /* E 类有两种形态，靠 holiday 是否存在区分：
       pair   工作日 / 节假日双曲线（D05 等日对规则）
       single 单条日曲线 + 时段比值（BA-S1 等夜间时段规则） */
  const paired = Array.isArray(hol) && hol.length === wd.length;

  const w0 = raw.windows?.[0] || {};
  const tm = w0.temperatureMatch || {};
  const m = raw.metrics || {};
  const hours = wd.map((_, i) => `${String(i).padStart(2, "0")}:00`);

  const base = {
    mode: paired ? "pair" : "single",
    hours,
    workday: wd,
    holiday: paired ? hol : null,
    group: GROUP_CN[raw.group] || raw.group || "",
    dayMin: Math.min(...wd),
    dayMax: Math.max(...wd),
  };

  if (paired) {
    /* pair 内部有两种结构，靠 algo 区分——同一 mode 不代表同一 payload：
         D05            windows[0].workday/holiday 对象 + temperatureMatch
                        metrics: residualRate / groupThreshold / passed
         DayPairResidual(AA-S2)  windows[0] 是 sWindow，只有 dateFrom/dateTo
                        metrics: residual / threshold，且没有 passed
       AA-S2 的日期映射是从三个窗口的 selectionReason 反推的：
       dateFrom = 工作日、dateTo = 假日（窗口2 因假日在前而出现 from > to）。
       后端没有显式字段，已要求补 workday/holiday 对象，补上后改回读对象。
       曲线本身不受影响——hourlyProfiles.workday/holiday 的键是明确的，
       且已复核 Σworkday×4 == eWork，两条线不会画反。 */
    const isDpr = m.algo === "DayPairResidual";
    return {
      ...base,
      algo: m.algo || "",
      wdDate: isDpr ? w0.dateFrom || "" : w0.workday?.date || "",
      holDate: isDpr ? w0.dateTo || "" : w0.holiday?.date || "",
      wdWeek: WEEK_CN[w0.workday?.label] || w0.workday?.label || "",
      holWeek: WEEK_CN[w0.holiday?.label] || w0.holiday?.label || "",
      selectionReason: w0.selectionReason || "",
      /* 假日曲线的标签取 selectionReason 的非数字前缀，用后端自己的措辞：
         AA-S2 写「假日01-04/工作日01-03」、BA-S2 写「周末01-04/工作日01-03」，
         两条同为 DayPairResidual 却用词不同，按 algo 硬编码会写错一条。
         D05 无此字段，回落到「节假日」（其规则本身判的就是法定节假日）。 */
      holName: (isDpr && String(w0.selectionReason || "").match(/^([^\d]+)/)?.[1]) || "节假日",
      wdTemp: tm.wdAvg,
      holTemp: tm.holAvg,
      tDelta: tm.delta,
      tThreshold: tm.threshold,
      residual: isDpr ? m.residual : m.residualRate,
      residualThreshold: isDpr ? m.threshold : m.groupThreshold,
      passed: m.passed,
      /* 刻意不使用 metrics.eWork / eHol / eOther：两条规则实测均为
         hourlyProfiles 积分的 4.0000 倍，见 rule-narrative.js 中 D05 的说明 */
      wdPeak: Math.max(...wd),
      wdBase: Math.min(...wd),
      holPeak: Math.max(...hol),
      holBase: Math.min(...hol),
    };
  }

  const isNdr = m.algo === "NdrRatio";
  /* StandbyRatio（AA-S1）。⚠ 夜间段跨零点：算法取「本日 21:00–24:00 +
     次日 00:00–05:00」，而 hourlyProfiles 只有本日，5/8 的取数不在图上。
     已用三窗口验证：eDay == Σ(08:00–17:00) × 4 精确成立，而 eNight 扫遍
     3–24h × 24 起点 × ×1/×4 均无匹配，最近的也差两个数量级于舍入误差。
     故底纹只标图上真有的两段（方案 A），00:00–05:00 不画——用底纹圈住
     本日数据却声称是算法取数，等于说假话。

     两条基准线用真实 kW：eDay/10 与 eNight/8 都是逐时积分的 4 倍
     （第四次复现的 4 倍缺陷），直接显示会大 4 倍。日间均值由逐时自算，
     夜间均值 = SR × 日间均值——分子分母同缩 4 倍，代数上精确，
     是单位换算不是复刻判定逻辑（✓/✕ 仍走 stepPassed 比阈值）。 */
  const isSr = m.algo === "StandbyRatio";
  const dayAvg = isSr && wd.length >= 18 ? wd.slice(8, 18).reduce((a, b) => a + b, 0) / 10 : NaN;
  const nightAvg = isSr && Number.isFinite(dayAvg) ? dayAvg * Number(m.sr) : NaN;

  return {
    ...base,
    date: w0.dateFrom || "",
    selectionReason: w0.selectionReason || "",
    frac: m.frac,
    pMid: m.pMid,
    pMax: m.pMax,
    threshold: m.threshold,
    algo: m.algo || "",
    /* MidnightFrac 的取数时段：23:00 至次日 04:00（手册 BA-S1 步骤 1）。
       跨零点，所以在 0–23 的时刻轴上是首尾两段。 */
    nightBands: m.algo === "MidnightFrac" ? [["00:00", "04:00"], ["23:00", "23:00"]] : [],

    /* NdrRatio（BC-S1）：两个取数时段各取均值，比值即判据。与 MidnightFrac
       不同构（两片底纹、两条时段均值线），所以走通用的 bands / marks；
       buildScheduleOption 优先消费它们，缺失时回落到上面的 nightBands 老路。
       时段边界按 step:"end" 的语义取闭开区间——第 i 个逐时值占据 [i, i+1]，
       故 01:00–05:00 对应索引 1–4，与后端取数一致（已用三个窗口复核）。 */
    pLow: m.pLow,
    pPeak: m.pPeak,
    ndr: m.ndr,
    sr: m.sr,
    dayAvg,
    nightAvg,
    /* markArea 在类目轴上「含末类目」（既有 BA-S1 的 ["00:00","04:00"]
       覆盖 0–4 时即此语义），故 to 写最后一个取数小时，不写时段右边界。
       label 仍按钟点写，因为第 4 小时结束时刻就是 05:00。 */
    bands: isNdr
      ? [
          { from: "01:00", to: "04:00", label: "01:00–05:00", fill: "rgba(122,92,255,.07)", text: "#7a5cff" },
          { from: "11:00", to: "14:00", label: "11:00–15:00", fill: "rgba(245,154,82,.10)", text: "#e08b2f" },
        ]
      : isSr
      ? [
          { from: "08:00", to: "17:00", label: "日间 08:00–18:00", fill: "rgba(245,154,82,.10)", text: "#e08b2f" },
          { from: "21:00", to: "23:00", label: "夜间(前段)", fill: "rgba(122,92,255,.07)", text: "#7a5cff" },
        ]
      : [],
    marks: isNdr
      ? [
          { y: m.pLow, label: `深夜平均 ${m.pLow} kW`, color: "#7a5cff" },
          { y: m.pPeak, label: `白天高峰平均 ${m.pPeak} kW`, color: "#e54e6e" },
        ]
      : isSr
      ? [
          { y: nightAvg, label: `夜间平均 ${nightAvg.toFixed(2)} kW`, color: "#7a5cff" },
          { y: dayAvg, label: `日间平均 ${dayAvg.toFixed(2)} kW`, color: "#e54e6e" },
        ]
      : [],
  };
}

export function buildScheduleOption(d, yName = "空调用电 (kW)") {
  const all = d.mode === "pair" ? [...d.workday, ...d.holiday] : [...d.workday];
  /* 单曲线形态要能容下 P_max 基准线——它取自更细粒度的原始读数，
     通常高于逐时均值曲线的最高点，若不放大上界就会被裁到框外。 */
  if (d.mode === "single" && Number.isFinite(d.pMax)) all.push(d.pMax);
  const min = Math.max(0, Math.floor(Math.min(...all) * 0.9));
  const max = Math.ceil(Math.max(...all) * 1.08);

  const line = (name, data, color, extra = {}) => ({
    name,
    type: "line",
    step: "end",
    symbol: "none",
    data,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    areaStyle: { color, opacity: 0.12 },
    emphasis: { focus: "series" },
    ...extra,
  });

  let series;
  if (d.mode === "pair") {
    /* AA-S2 无 weekday 标签，D05 有；缺项时不留空格尾巴。
       D05 判的就是法定节假日，标签保持「节假日」不动；
       AA-S2 实际选窗取到的是周末，只能用中性的「假日」。 */
    const tag = (name, date, week) => [name, String(date || "").slice(5), week].filter(Boolean).join(" ");
    series = [
      line(tag("工作日", d.wdDate, d.wdWeek), d.workday, "#2f7fff"),
      line(tag(d.holName || "节假日", d.holDate, d.holWeek), d.holiday, "#f59a52"),
    ];
  } else {
    const marks = [];
    /* 通用形态（NdrRatio 等）：基准线由 parseSchedule 给全，条数不固定 */
    if (d.marks?.length) {
      d.marks.forEach((k) => {
        if (Number.isFinite(k.y))
          marks.push({
            yAxis: k.y,
            lineStyle: { color: k.color, type: "dashed", width: 1 },
            label: { formatter: k.label, color: k.color },
          });
      });
    }
    if (!marks.length && Number.isFinite(d.pMid))
      marks.push({
        yAxis: d.pMid,
        lineStyle: { color: "#f59a52", type: "dashed", width: 1 },
        label: { formatter: `夜间平均 ${d.pMid} kW`, color: "#e08b2f" },
      });
    if (Number.isFinite(d.pMax))
      marks.push({
        yAxis: d.pMax,
        lineStyle: { color: "#e54e6e", type: "dashed", width: 1 },
        label: { formatter: `系统最大 ${d.pMax} kW`, color: "#e54e6e" },
      });

    series = [
      line(`${d.date.slice(5)} 逐时功率`, d.workday, "#2f7fff", {
        markLine: { silent: true, symbol: "none", label: { fontSize: 11, position: "insideEndTop" }, data: marks },
        /* 标出取数时段本身，让 P_mid 这个数在图上有落点 */
        markArea: d.bands?.length
          ? {
              silent: true,
              label: { show: true, position: "insideTop", fontSize: 10 },
              data: d.bands.map((b) => [
                { xAxis: b.from, itemStyle: { color: b.fill }, label: { formatter: b.label, color: b.text } },
                { xAxis: b.to },
              ]),
            }
          : d.nightBands.length
          ? {
              silent: true,
              itemStyle: { color: "rgba(122,92,255,.07)" },
              label: { show: true, position: "insideTop", color: "#7a5cff", fontSize: 10, formatter: "23:00–04:00" },
              data: d.nightBands.map(([a, b]) => [{ xAxis: a }, { xAxis: b }]),
            }
          : undefined,
      }),
    ];
  }

  return {
    grid: { left: 66, right: 26, top: 46, bottom: 52 },
    legend: { top: 6, right: 10, itemWidth: 14, itemHeight: 2, textStyle: { color: COLOR.axisName, fontSize: 11 } },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      axisPointer: { type: "line", lineStyle: { color: "rgba(60,110,200,.25)" } },
    },
    xAxis: {
      type: "category",
      data: d.hours,
      boundaryGap: false,
      name: d.mode === "pair" ? "时刻" : "时刻（当日 00:00–23:00）",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 10, interval: (i) => i % 3 === 0 },
      splitLine: { show: true, lineStyle: { color: "rgba(60,110,200,.05)" } },
    },
    yAxis: {
      type: "value",
      name: yName,
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
      splitLine: { lineStyle: { color: COLOR.split } },
    },
    series,
  };
}

/* ───────────────────────────── C 类：升温日对 ─────────────────────────────
   C03（CR0021）。两个节点 × 两天，共 4 个日总电耗值。

   为什么不画分组柱状图：泵与主机的绝对值差约 90 倍（72 vs 6578 kWh），
   泵柱在同一纵轴上是一条看不见的线；而判据比的本来就是相对涨幅。
   故归一化到 Day A = 100%，两条线的斜率即各自涨幅。

   合格线 = 100% + Δ机 / 3，是判据 R ≥ 1/3 ⇔ Δ泵 ≥ Δ机 × 阈值 的代数改写，
   只用了后端的 deltaChiller 与 threshold，未复刻判定逻辑（✓/✕ 仍取 passed）。
   Δ机 ≤ 0 时该线无工程含义，此时不画。 */
export function parseDayPair(raw) {
  if (!raw || raw.type !== "dayPair") return null;
  const src = raw.energyBreakdown?.series || [];
  if (src.length < 2) return null;

  const m = raw.metrics || {};
  const rate = (r) => (Number(r.dayA) ? (Number(r.dayB) - Number(r.dayA)) / Number(r.dayA) : NaN);
  const rows = src.map((r) => ({
    name: r.name,
    dayA: Number(r.dayA),
    dayB: Number(r.dayB),
    delta: Number(r.delta),
    rate: rate(r),
  }));

  const base = {
    kind: "dayPair",
    algo: m.r_pump_chiller !== undefined ? "PumpChillerRatio" : "RejectDelta",
    dayA: raw.dayA?.date || raw.windowDays?.[0] || "",
    dayB: raw.dayB?.date || raw.windowDays?.[1] || "",
    labelA: raw.dayA?.label || "Day A",
    labelB: raw.dayB?.label || "Day B",
    unit: raw.energyBreakdown?.unit || "kWh",
    rows,
    threshold: Number(m.threshold),
    passed: m.passed,
    /* C02 的 meteorology 带数值，C03 的只有变量名与单位 */
    meteoVar: raw.meteorology?.variable || "",
    meteoA: raw.meteorology?.dayA,
    meteoB: raw.meteorology?.dayB,
    meteoDelta: raw.meteorology?.delta,
    meteoThreshold: raw.meteorology?.threshold,
    meteoUnit: raw.meteorology?.unit || "",
    meteoPassed: raw.meteorology?.conditionPassed,
  };

  /* C03（CR0021）：泵与主机各自涨幅之比，两节点 */
  if (base.algo === "PumpChillerRatio") {
    const pick = (code) => rows.find((r) => String(r.name).startsWith(code)) || null;
    const pump = pick("U2A01");
    const chiller = pick("U2A00");
    if (!pump || !chiller) return null;
    const dPump = Number.isFinite(Number(m.deltaPump)) ? Number(m.deltaPump) : pump.rate;
    const dChiller = Number.isFinite(Number(m.deltaChiller)) ? Number(m.deltaChiller) : chiller.rate;
    const th = Number(m.threshold);
    return {
      ...base,
      rows: [pump, chiller],
      pumpName: pump.name,
      chillerName: chiller.name,
      dPump,
      dChiller,
      r: Number(m.r_pump_chiller),
      /* 泵至少应到达的相对位置（%）；Δ机 ≤ 0 时不成立 */
      passLine: dChiller > 0 && Number.isFinite(th) ? 100 + dChiller * th * 100 : null,
    };
  }

  /* C02（CR0019）：散热侧合计的相对变化率。节点数不定（实测 3 个），
     且 energyBreakdown 另给 totalDayA / totalDayB —— 注意 modelNodes 的
     parentNodeId 表明 U2A02 / U2A04 是 U2A00 的子节点，合计把两者算了两遍，
     已挂问题清单。前端如实复述后端的合计，不自行改口径。 */
  const tA = Number(raw.energyBreakdown?.totalDayA);
  const tB = Number(raw.energyBreakdown?.totalDayB);
  return {
    ...base,
    totalA: tA,
    totalB: tB,
    totalRate: Number.isFinite(tA) && tA ? (tB - tA) / tA : NaN,
    deltaEta: Number(m.deltaEta),
  };
}

export function buildDayPairOption(d) {
  if (d.algo === "RejectDelta") return buildRejectDeltaOption(d);
  const pumpPts = [100, 100 + d.dPump * 100];
  const chillerPts = [100, 100 + d.dChiller * 100];
  const all = [...pumpPts, ...chillerPts, d.passLine].filter(Number.isFinite);
  const min = Math.floor(Math.min(...all, 100) - 4);
  const max = Math.ceil(Math.max(...all) + 4);
  const fmt = (v) => `${v.toFixed(1)}%`;

  const mkLine = (name, pts, color) => ({
    name,
    type: "line",
    data: pts.map((v) => Number(v.toFixed(2))),
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { color, width: 2.5 },
    itemStyle: { color },
    label: {
      show: true,
      position: "top",
      color,
      fontSize: 11,
      fontWeight: 600,
      formatter: (p) => fmt(p.value),
    },
  });

  const pump = mkLine(d.pumpName, pumpPts, COLOR.days[0]);
  const chiller = mkLine(d.chillerName, chillerPts, COLOR.days[2]);

  if (Number.isFinite(d.passLine)) {
    pump.markLine = {
      silent: true,
      symbol: "none",
      data: [{ yAxis: Number(d.passLine.toFixed(2)) }],
      lineStyle: { color: COLOR.highText, type: "dashed", width: 1 },
      label: {
        formatter: `泵的合格位置 ${d.passLine.toFixed(1)}%`,
        color: COLOR.highText,
        fontSize: 10,
      },
    };
  }

  return {
    grid: { left: 66, right: 92, top: 46, bottom: 44 },
    legend: {
      top: 6,
      right: 10,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: COLOR.axisName, fontSize: 11 },
      data: [d.pumpName, d.chillerName],
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      formatter: (ps) => {
        const i = ps[0].dataIndex;
        const head = i === 0 ? `${d.labelA} ${d.dayA}` : `${d.labelB} ${d.dayB}`;
        const body = d.rows
          .map((r) => `${r.name}：<b>${i === 0 ? r.dayA : r.dayB} ${d.unit}</b>`)
          .join("<br/>");
        return `${head}<br/>${body}`;
      },
    },
    xAxis: {
      type: "category",
      data: [`${d.labelA} ${String(d.dayA).slice(5)}`, `${d.labelB} ${String(d.dayB).slice(5)}`],
      boundaryGap: ["18%", "18%"],
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "相对升温前 (%)",
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11, formatter: "{value}%" },
      splitLine: { lineStyle: { color: COLOR.split } },
    },
    series: [pump, chiller],
  };
}

/* C02（CR0019）。同为归一化斜率图，但线数不定：各分项节点 + 后端给的合计。
   合计线加粗，因为判据只看它；分项线细，用来看是谁在响应、谁没动。
   量纲差异大（实测 132 – 10242 kWh），归一化到 Day A = 100% 后可同轴比较。

   ⚠ 不画「合格线」。手册 C02 的判据 Δη ≥ -5% 与它自己给的
   Δη = (E_A - E_B)/E_A 定义方向相反（按该定义，「降幅不足 5%」应是
   Δη < 5%）。在方向未澄清前画一条合格线，等于替后端选一种解释。
   ✓/✕ 仍取后端 passed，图上只呈现实测变化。 */
function buildRejectDeltaOption(d) {
  const norm = (a, b) => [100, Number(a) ? (Number(b) / Number(a)) * 100 : 100];
  const lines = d.rows.map((r, i) => ({
    name: r.name,
    type: "line",
    data: norm(r.dayA, r.dayB).map((v) => Number(v.toFixed(2))),
    symbol: "circle",
    symbolSize: 6,
    lineStyle: { color: COLOR.days[i % COLOR.days.length], width: 1.5, type: "dashed" },
    itemStyle: { color: COLOR.days[i % COLOR.days.length] },
    label: {
      show: true,
      position: "right",
      color: COLOR.days[i % COLOR.days.length],
      fontSize: 10,
      formatter: (p) => (p.dataIndex === 1 ? `${p.value.toFixed(1)}%` : ""),
    },
  }));

  const totalName = `合计 ${d.rows.length} 项`;
  const totalPts = norm(d.totalA, d.totalB);
  lines.push({
    name: totalName,
    type: "line",
    data: totalPts.map((v) => Number(v.toFixed(2))),
    symbol: "circle",
    symbolSize: 9,
    lineStyle: { color: "#0f1d3d", width: 2.5 },
    itemStyle: { color: "#0f1d3d" },
    label: {
      show: true,
      position: "right",
      color: "#0f1d3d",
      fontSize: 11,
      fontWeight: 600,
      formatter: (p) => (p.dataIndex === 1 ? `${p.value.toFixed(1)}%` : ""),
    },
  });

  const all = lines.flatMap((l) => l.data);
  const min = Math.floor(Math.min(...all, 100) - 5);
  const max = Math.ceil(Math.max(...all) + 5);
  const meteo =
    Number.isFinite(Number(d.meteoDelta))
      ? `${d.meteoVar} ${d.meteoA}${d.meteoUnit} → ${d.meteoB}${d.meteoUnit}`
      : "";

  return {
    grid: { left: 66, right: 104, top: 46, bottom: 44 },
    legend: {
      top: 6,
      right: 10,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: COLOR.axisName, fontSize: 11 },
      data: lines.map((l) => l.name),
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "rgba(60,110,200,.2)",
      textStyle: { color: "#0f1d3d", fontSize: 12 },
      formatter: (ps) => {
        const i = ps[0].dataIndex;
        const head = i === 0 ? `${d.labelA} ${d.dayA}` : `${d.labelB} ${d.dayB}`;
        const body = d.rows
          .map((r) => `${r.name}：<b>${i === 0 ? r.dayA : r.dayB} ${d.unit}</b>`)
          .join("<br/>");
        const tot = `合计：<b>${i === 0 ? d.totalA : d.totalB} ${d.unit}</b>`;
        return `${head}<br/>${body}<br/>${tot}`;
      },
    },
    xAxis: {
      type: "category",
      data: [
        `${d.labelA} ${String(d.dayA).slice(5)}`,
        `${d.labelB} ${String(d.dayB).slice(5)}`,
      ],
      name: meteo,
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      boundaryGap: ["18%", "18%"],
      axisLine: { lineStyle: { color: COLOR.line } },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: "相对降温前 (%)",
      nameLocation: "middle",
      nameGap: 46,
      nameTextStyle: { color: COLOR.axisName, fontSize: 11 },
      min,
      max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: COLOR.axis, fontSize: 11, formatter: "{value}%" },
      splitLine: { lineStyle: { color: COLOR.split } },
    },
    series: lines,
  };
}
