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
  const hol = raw.hourlyProfiles?.holiday;
  if (!Array.isArray(wd) || !Array.isArray(hol) || !wd.length) return null;

  const w0 = raw.windows?.[0] || {};
  const tm = w0.temperatureMatch || {};
  const m = raw.metrics || {};

  const hours = wd.map((_, i) => `${String(i).padStart(2, "0")}:00`);
  return {
    hours,
    workday: wd,
    holiday: hol,
    wdDate: w0.workday?.date || "",
    holDate: w0.holiday?.date || "",
    wdWeek: WEEK_CN[w0.workday?.label] || w0.workday?.label || "",
    holWeek: WEEK_CN[w0.holiday?.label] || w0.holiday?.label || "",
    wdTemp: tm.wdAvg,
    holTemp: tm.holAvg,
    tDelta: tm.delta,
    tThreshold: tm.threshold,
    residual: m.residualRate,
    residualThreshold: m.groupThreshold,
    passed: m.passed,
    group: GROUP_CN[raw.group] || raw.group || "",
    /* 曲线自身的统计量。刻意不使用 metrics.eWork / eHol：
       两者恰为曲线积分的 4 倍（后端疑似把 96 个 15 分钟读数直接求和），
       直接显示会与图对不上。R 是比值不受影响，照用。 */
    wdPeak: Math.max(...wd),
    wdBase: Math.min(...wd),
    holPeak: Math.max(...hol),
    holBase: Math.min(...hol),
  };
}

export function buildScheduleOption(d, yName = "空调用电 (kW)") {
  const all = [...d.workday, ...d.holiday];
  const min = Math.max(0, Math.floor(Math.min(...all) * 0.9));
  const max = Math.ceil(Math.max(...all) * 1.08);

  /* hourlyProfiles 是逐时聚合值——每个数代表该小时的平均功率，不是瞬时采样。
     用阶梯图（每小时一个平台）如实表达；平滑曲线会在两个小时之间插出数据里
     没有的弧度，还会让峰值超过真实最大值。 */
  const line = (name, data, color) => ({
    name,
    type: "line",
    step: "end",
    symbol: "none",
    data,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    areaStyle: { color, opacity: 0.12 },
    emphasis: { focus: "series" },
  });

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
      name: "时刻",
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
    series: [
      line(`工作日 ${d.wdDate.slice(5)} ${d.wdWeek}`, d.workday, "#2f7fff"),
      line(`节假日 ${d.holDate.slice(5)} ${d.holWeek}`, d.holiday, "#f59a52"),
    ],
  };
}
