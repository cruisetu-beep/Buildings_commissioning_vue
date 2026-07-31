<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleDetailArea · 中栏 · 选中规则的判定详情 + 计算过程(内联)
   ───────────────────────────────────────────────────────────────
   计算过程内容(图表 + 结论/指标/窗口面板)直接内联于此,由 viz mock
   驱动(getVizRule),切换窗口时图与面板同步。方向 A:窗口内容取自 viz
   示例,后端 CalcResult 接口就绪后把 getVizRule 换为真接口即可全真。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import Icon from "../icons/Icon.vue";
import SeriesTag from "../common/SeriesTag.vue";
import PriorityChip from "../common/PriorityChip.vue";
import CategoryStatusChip from "../common/CategoryStatusChip.vue";
import RuleVisualization from "./RuleVisualization.vue";
import VerdictCard from "./VerdictCard.vue";
import MetricsPanel from "./MetricsPanel.vue";
import MarkdownView from "../common/MarkdownView.vue";
import "../../assets/styles/rule-viz.css"; // 面板样式(verdict/metrics/window/viz-chart)依赖此表

const VIZ_TYPE_LABEL = {
  A: "K-means 聚类",
  B: "线性回归",
  C: "日对对比",
  D: "分布直方图",
  E: "作息模式",
};

function decodeUnicode(str) {
  if (typeof str !== "string") return str;
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
  } catch (e) {
    return str;
  }
}

const props = defineProps({
  result: { type: Object, default: null },
});
const emit = defineEmits(["open-detail"]);

const windowIdx = ref(0);
watch(() => props.result?.ruleCode, () => { windowIdx.value = 0; });

const windows = computed(() => props.result?.windows || []);
const activeWindow = computed(() => windows.value[windowIdx.value] || null);

const visualType = computed(() => {
  const t = activeWindow.value?.calcResult?.visualType || props.result?.visualType || "";
  return typeof t === "string" ? t.toUpperCase() : "";
});

// 专为 ECharts 图表转换真实数据库 ResultJSON 的适配器，脱离假数据依赖
const chartData = computed(() => {
  const realJson = activeWindow.value?.calcResult?.resultJson;
  if (!realJson) {
    return {};
  }
  
  try {
    const raw = JSON.parse(realJson);
    const vType = raw.visualType || visualType.value;

    // ================== A 类 (K-means 聚类) ==================
    if (vType === "A" || raw.type === "clustering") {
      const pts = raw.dataPoints || [];
      if (pts.length > 0) {
        const low = [];
        const high = [];
        const c1Points = raw.clusters?.c1?.points || [];
        const c2Points = raw.clusters?.c2?.points || [];
        const targetTemp = raw.temperatureRange?.target || 6.7;
        const deltaTemp = raw.temperatureRange?.delta || 1;
        
        const c1Label = decodeUnicode(raw.clusters?.c1?.label) || "";
        const c2Label = decodeUnicode(raw.clusters?.c2?.label) || "";
        const xName = decodeUnicode(raw.xName || raw.xAxisName) || "室外干球温度 (℃)";
        const yName = decodeUnicode(raw.yName || raw.yAxisName) || "空调系统总电耗 (kW)";
        
        pts.forEach(p => {
          let hourVal = 9;
          if (p.hour && p.hour.includes("T")) {
            const timePart = p.hour.split("T")[1];
            const [hStr, mStr] = timePart.split(":");
            hourVal = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;
          }
          const clampedHour = Math.max(9, Math.min(17, hourVal));
          const t = (targetTemp - deltaTemp * 0.6) + ((clampedHour - 9) / 8) * (deltaTemp * 1.2);
          const y = p.energy;
          if (c1Points.includes(y)) {
            low.push([+t.toFixed(2), y]);
          } else {
            high.push([+t.toFixed(2), y]);
          }
        });
        
        const lowMean = raw.clusters?.c1?.center !== undefined ? Math.round(raw.clusters.c1.center) : 0;
        const highMean = raw.clusters?.c2?.center !== undefined ? Math.round(raw.clusters.c2.center) : 0;
        const clusterDiff = raw.metrics?.clusterDiff !== undefined ? (raw.metrics.clusterDiff * 100).toFixed(1) : "—";
        const silhouette = raw.metrics?.silhouetteScore !== undefined ? raw.metrics.silhouetteScore.toFixed(2) : "—";
        
        const xMin = +(targetTemp - deltaTemp).toFixed(1);
        const xMax = +(targetTemp + deltaTemp).toFixed(1);
        const yCoords = [...low, ...high].map(pt => pt[1]);
        const yMin = yCoords.length ? Math.floor(Math.min(...yCoords) - 5) : 30;
        const yMax = yCoords.length ? Math.ceil(Math.max(...yCoords) * 1.2) : 80;

        const passed = raw.category !== "目标调适";

        return {
          low,
          high,
          lowMean,
          highMean,
          lowLabel: c1Label,
          highLabel: c2Label,
          xMin, xMax, yMin, yMax,
          xName,
          yName,
          highlight: {
            value: `Δ = ${clusterDiff}%`,
            sub: `S = ${silhouette}`,
            color: passed ? "ok" : "warn"
          },
          rawDataPoints: pts,
          targetTemp,
          c1Points,
          c2Points
        };
      }
    }

    // ================== B 类 (线性回归) ==================
    if (vType === "B" || raw.type === "regression") {
      const pts = raw.dataPoints || [];
      if (pts.length > 0) {
        const points = pts.map(p => {
          const x = p.t_db !== undefined ? p.t_db : (p.temp !== undefined ? p.temp : 0);
          const y = p.energy !== undefined ? p.energy : 0;
          return [x, y];
        });

        const reg = raw.regression || {};
        const tempRange = reg.temperatureRange || [20, 35];
        const k = reg.slope_k ?? 0;
        const b = reg.intercept_b ?? 0;
        
        const x1 = tempRange[0];
        const y1 = +(k * x1 + b).toFixed(2);
        const x2 = tempRange[1];
        const y2 = +(k * x2 + b).toFixed(2);
        const fitLine = [[x1, y1], [x2, y2]];

        const yCoords = [...points.map(pt => pt[1]), y1, y2];
        const minYVal = yCoords.length ? Math.min(...yCoords) : 0;
        const maxYVal = yCoords.length ? Math.max(...yCoords) : 100;

        const yMax = Math.ceil(maxYVal * 1.2);
        const yMin = Math.max(0, Math.floor(minYVal - 5));

        const r2 = reg.rSquared !== undefined ? reg.rSquared.toFixed(4) : "—";
        const r2Passed = raw.metrics?.r2Passed ?? false;
        const r2Threshold = raw.metrics?.rSquaredThreshold !== undefined 
          ? raw.metrics.rSquaredThreshold.toFixed(1) 
          : "0.6";

        // 双模态高亮指标卡判定 (EUI 强度 vs R² 拟合度)
        let highlight = {};
        if (raw.eui) {
          const calcEui = raw.eui.calculated !== undefined ? raw.eui.calculated.toFixed(2) : "—";
          const limitEui = raw.eui.limitCorrected !== undefined ? raw.eui.limitCorrected.toFixed(2) : "—";
          const isPassed = raw.category !== "目标调适";
          highlight = {
            value: `EUI = ${calcEui}`,
            sub: `限额 ${limitEui} ${raw.eui.unit || "W/m²·h"}`,
            color: isPassed ? "ok" : "warn"
          };
        } else {
          highlight = {
            value: `R² = ${r2}`,
            sub: r2Passed ? `达标 (≥${r2Threshold})` : `未达标 (<${r2Threshold})`,
            color: r2Passed ? "ok" : "warn"
          };
        }

        const xMin = Math.floor(x1 - 1);
        const xMax = Math.ceil(x2 + 1);
        const xName = decodeUnicode(raw.xName || raw.xAxisName) || "室外干球温度 (℃)";
        const yName = decodeUnicode(raw.yName || raw.yAxisName) || "空调系统总电耗 (kW)";

        const rawDataPoints = pts.map(p => ({
          drybulb: p.t_db !== undefined ? p.t_db : (p.temp !== undefined ? p.temp : "—"),
          energy: p.energy !== undefined ? p.energy : "—"
        }));

        return {
          points,
          fitLine,
          pointName: "实际电耗",
          lineName: "回归拟合线",
          xMin, xMax, yMin, yMax,
          xName,
          yName,
          highlight,
          rawDataPoints,
          targetTemp: "—"
        };
      }
    }

    // ================== D 类 (分布直方图) ==================
    if (vType === "D" || raw.type === "distribution") {
      const buckets = raw.distributionBuckets || raw.buckets || [];
      if (buckets.length > 0) {
        const cvVal = raw.metrics?.cv !== undefined ? raw.metrics.cv.toFixed(3) : "—";
        const cvThr = raw.metrics?.cvThreshold !== undefined ? raw.metrics.cvThreshold.toFixed(2) : "0.15";
        const rMax = raw.metrics?.maxMeanRatio !== undefined ? raw.metrics.maxMeanRatio.toFixed(2) : "—";
        const isPassed = raw.category !== "目标调适";

        const highlight = {
          value: `CV = ${cvVal}`,
          sub: `Rmax = ${rMax} (限制<${raw.metrics?.ratioThreshold || '1.2'})`,
          color: isPassed ? "ok" : "warn"
        };

        const rawDataPoints = buckets.map(b => ({
          range: b.range || "—",
          count: b.count !== undefined ? b.count : "—"
        }));

        return {
          buckets: buckets.map(b => ({ ...b, range: decodeUnicode(b.range) || "—" })),
          zeroIdx: 0,
          emphasisIdx: [],
          xName: "电耗区间",
          yName: "频次/小时数",
          highlight,
          rawDataPoints,
          targetTemp: "—"
        };
      }
    }
    
    // ================== E 类 (作息 24h 对比) ==================
    if (vType === "E" || raw.type === "schedule") {
      const workdayData = raw.hourlyProfiles?.workday || [];
      const holidayData = raw.hourlyProfiles?.holiday || [];
      if (workdayData.length > 0 || holidayData.length > 0) {
        const residualRate = raw.metrics?.residualRate !== undefined ? (raw.metrics.residualRate * 100).toFixed(1) : "—";
        const passed = raw.metrics?.passed ?? true;
        const groupThreshold = raw.metrics?.groupThreshold !== undefined ? (raw.metrics.groupThreshold * 100).toFixed(0) : "40";

        const pts = [];
        for (let i = 0; i < 24; i++) {
          pts.push({
            hour: `${i.toString().padStart(2, '0')}:00`,
            valA: workdayData[i] !== undefined ? workdayData[i] : "—",
            valB: holidayData[i] !== undefined ? holidayData[i] : "—"
          });
        }

        return {
          seriesA: {
            name: decodeUnicode(raw.seriesA?.name) || "",
            data: workdayData
          },
          seriesB: {
            name: decodeUnicode(raw.seriesB?.name) || "",
            data: holidayData
          },
          xName: decodeUnicode(raw.xName || raw.xAxisName) || "时刻 (h)",
          yName: decodeUnicode(raw.yName || raw.yAxisName) || "逐时功率 (kW)",
          highlight: {
            value: `${residualRate}%`,
            sub: passed ? "达标" : `超限 (>${groupThreshold}%)`,
            color: passed ? "ok" : "warn"
          },
          rawDataPoints: pts,
          targetTemp: "—"
        };
      }
    }

    // ================== C 类 (日对柱状图) ==================
    if (vType === "C" || raw.type === "dayPair") {
      const series = raw.energyBreakdown?.series || raw.series || [];
      if (series.length > 0) {
        const deltaEta = raw.metrics?.deltaEta !== undefined ? (raw.metrics.deltaEta * 100).toFixed(1) : "—";
        const triggered = raw.category === "目标调适";
        const unit = raw.energyBreakdown?.unit || raw.unit || "kWh";
        
        const pts = series.map(s => ({
          name: decodeUnicode(s.name) || "",
          dayA: s.dayA,
          dayB: s.dayB,
          delta: s.delta
        }));

        const isRPump = raw.metrics?.r_pump_chiller !== undefined;
        const highlightValue = isRPump
          ? `R = ${parseFloat(raw.metrics.r_pump_chiller).toFixed(3)}`
          : `Δη = ${deltaEta}%`;

        const thresholdVal = raw.metrics?.threshold !== undefined 
          ? (isRPump ? `1/3` : `${Math.round(raw.metrics.threshold * 100)}%`) 
          : "33.3%";

        return {
          series: series.map(s => ({ ...s, name: decodeUnicode(s.name) || "" })),
          unit,
          dayALabel: decodeUnicode(raw.dayA?.label || raw.dayALabel) || "",
          dayBLabel: decodeUnicode(raw.dayB?.label || raw.dayBLabel) || "",
          xName: decodeUnicode(raw.xName || raw.xAxisName) || "设备分项",
          yName: decodeUnicode(raw.yName || raw.yAxisName) || `能耗 (${unit})`,
          highlight: {
            value: highlightValue,
            sub: triggered ? `超限 (>${thresholdVal})` : `达标 (≤${thresholdVal})`,
            color: triggered ? "warn" : "ok"
          },
          rawDataPoints: pts,
          targetTemp: "—"
        };
      }
    }

    return {};
    
  } catch (e) {
    console.error("Failed to adapt chartData from resultJson", e);
    return {};
  }
});

// 结论/指标面板绑定接口真实大楼结果数据
const triggered = computed(() => props.result?.category === "目标调适");
const conclusion = computed(() => props.result?.judgmentStandard || "");
const metrics = computed(() => {
  // 1. 判断是否有真实的 calcResult
  const calcResult = activeWindow.value?.calcResult;
  if (!calcResult) return []; // 无真实计算结果时，不展示任何指标（防造假）

  // 2. 提取出真实接口公式中的键值对
  const rawFs = calcResult.formulaSubstitution;
  if (!rawFs || typeof rawFs !== "string") {
    return [];
  }
  
  const realValues = {};
  const parts = rawFs.split(/[，,]/);
  parts.forEach(part => {
    if (!part || !part.includes("=")) return;
    const [rawKey, rawVal] = part.split("=");
    const key = rawKey.trim();
    let val = rawVal.trim();
    if (val.endsWith("%")) val = val.replace("%", "");
    if (val.toLowerCase().endsWith("kwh")) val = val.replace(/kwh/i, "");
    realValues[key] = val;
  });

  const list = [];
  
  // 根据解析出来的键，遍历并转换成指标项
  Object.keys(realValues).forEach(key => {
    const val = realValues[key];
    
    let label = key;
    let value = val;
    let unit = "";
    let threshold = "";
    let info = "";
    let triggered = false;

    // 对特定的变量键进行汉化与单位处理
    if (key === "R" || key === "residualRate") {
      label = "残留率 R";
      unit = "%";
      const valNum = parseFloat(val);
      if (valNum <= 1) {
        value = (valNum * 100).toFixed(1);
      }
      
      // 尝试联动提取 th
      const thVal = realValues["th"] || realValues["threshold"];
      if (thVal !== undefined && thVal !== null) {
        const thNum = parseFloat(thVal);
        threshold = `≤ ${(thNum * 100).toFixed(0)}%`;
        triggered = parseFloat(value) > (thNum * 100);
      }
      info = "非营业时段与营业时段功率日均比";
    } else if (key === "th" || key === "threshold") {
      label = "残留率阈值 th";
      unit = "%";
      const valNum = parseFloat(val);
      if (valNum <= 1) {
        value = (valNum * 100).toFixed(0);
      }
      info = "该建筑对应业态分组下的作息残留率上限阈值";
    } else if (key === "group") {
      label = "作息分组";
      if (val === "Intermittent") {
        value = "间歇运营(BA)";
      } else if (val === "Continuous") {
        value = "连续运营";
      }
      info = "业态作息分组";
    } else if (key === "c1" || key === "low") {
      label = "低工况均值";
      unit = "kW";
    } else if (key === "c2" || key === "high") {
      label = "高工况均值";
      unit = "kW";
    } else if (key === "S" || key === "silhouette" || key === "silhouetteScore") {
      label = "轮廓系数 S";
      info = "聚类质量指标";
    } else if (key === "Δ" || key === "delta" || key === "deltaEta" || key === "clusterDiff") {
      label = "双工况分离度 Δ";
      unit = "%";
      const valNum = parseFloat(val);
      if (valNum <= 1) {
        value = (valNum * 100).toFixed(1);
      }
    }

    list.push({
      label,
      value,
      unit,
      threshold,
      triggered,
      info
    });
  });

  return list;
});
</script>

<template>
  <div v-if="!result" class="rd-empty">
    <Icon name="chevron-l" :size="20" stroke="var(--text-3)" />
    <div>从左侧规则大纲选择一条规则查看详情</div>
  </div>

  <div v-else class="rd-area">
    <!-- 规则头 -->
    <div class="rd-head">
      <div class="rd-head-title">
        <span class="rd-code mono">{{ result.ruleCode }}</span>
        <span class="rd-name">{{ result.ruleName }}</span>
        <button class="rd-viz-btn" title="查看规则详细" @click="emit('open-detail', result.ruleCode)">
          <Icon name="rules" :size="13" />
          <span>规则详细</span>
        </button>
      </div>
      <div class="rd-head-tags">
        <SeriesTag :series="result.series" />
        <PriorityChip :priority="result.priority" />
        <CategoryStatusChip :category="result.category" />
        <span v-if="result.validCount > 0" class="rd-ratio-badge mono">
          触发 <b>{{ result.triggerCount }}</b> / 有效 <b>{{ result.validCount }}</b>
        </span>
      </div>
    </div>

    <!-- 计算过程(切换窗口同步) -->
    <template v-if="result && windows.length">
      <div class="rd-section-title">
        <Icon name="flask" :size="13" stroke="var(--brand)" />
        <span>计算过程</span>
        <span v-if="visualType" class="viz-type-badge mono">{{ visualType }} · {{ VIZ_TYPE_LABEL[visualType] || "未分类" }}</span>
        <span class="rd-section-hint">共 {{ windows.length }} 个窗口</span>
      </div>

      <!-- 窗口切换 -->
      <div class="rd-win-tabs">
        <button
          v-for="(win, i) in windows"
          :key="i"
          class="rd-win-tab"
          :class="{ active: i === windowIdx }"
          @click="windowIdx = i"
        >
          <span class="mono">窗口 {{ i + 1 }}</span>
          <span class="rd-win-tab-period">{{ win.dateFrom }} 至 {{ win.dateTo }}</span>
        </button>
      </div>

      <!-- 竖排:结论 → 指标 → 图表(图在最下) -->
      <div v-if="activeWindow" class="rd-viz-stack">
        <VerdictCard :triggered="triggered" :conclusion="conclusion" :rule-code="result.ruleCode" />
        <MetricsPanel v-if="metrics.length > 0" :metrics="metrics" collapsible default-collapsed />
        <div class="rd-viz-chart card glow">
          <RuleVisualization
            :rule-code="result.ruleCode"
            :visual-type="visualType"
            :chart="chartData"
            :date-from="activeWindow?.dateFrom || ''"
            :date-to="activeWindow?.dateTo || ''"
            :window-idx="windowIdx"
            :condition="activeWindow?.meteoCondition || '—'"
          />
        </div>
      </div>
    </template>

    <div v-else class="rd-viz-empty">
      <Icon name="lock" :size="18" stroke="var(--text-3)" />
      <span>该规则的计算过程数据待接入</span>
    </div>
  </div>
</template>
