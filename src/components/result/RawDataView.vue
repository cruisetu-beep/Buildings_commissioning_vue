<script setup>
/* ═══════════════════════════════════════════════════════════════
   RawDataView · 原始数据表(嵌入图表区,替换图表显示)
   支持根据 visualType 动态调整表头与表格列
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";

const props = defineProps({
  minHeight: { type: [String, Number], default: 420 },
  visualType: { type: String, default: "A" }, // A/B/C/D/E
  chart: { type: Object, default: () => ({}) }, // 原始图表配置,获取 dayALabel 等
  rawData: { type: Array, default: null }, // 外部传入的真实数据点
  targetTemp: { type: [Number, String], default: "—" }, // 筛选温度
  dateFrom: { type: String, default: "" }, // 窗口开始日期
  dateTo: { type: String, default: "" }, // 窗口结束日期
  windowIdx: { type: Number, default: 0 } // 窗口索引
});

// 动态列属性
const columns = computed(() => {
  const vType = props.visualType;
  const c = props.chart || {};
  
  if (vType === "C") {
    const u = c.unit || "kWh";
    const labelA = c.dayALabel || "Day A";
    const labelB = c.dayBLabel || "Day B";
    return [
      { key: "name", label: "设备分项" },
      { key: "dayA", label: `${labelA} (${u})` },
      { key: "dayB", label: `${labelB} (${u})` },
      { key: "delta", label: `两日差值 (${u})` }
    ];
  }
  
  if (vType === "E") {
    const labelA = c.seriesA?.name || "工作日";
    const labelB = c.seriesB?.name || "节假日";
    return [
      { key: "hour", label: "时刻" },
      { key: "valA", label: `${labelA}功率 (kW)` },
      { key: "valB", label: `${labelB}功率 (kW)` }
    ];
  }
  
  if (vType === "B") {
    return [
      { key: "index", label: "散点序号" },
      { key: "drybulb", label: "室外干球温度 (℃)" },
      { key: "power", label: "设备电耗 (kW)" }
    ];
  }
  
  if (vType === "D") {
    return [
      { key: "range", label: "电耗区间 (kW)" },
      { key: "count", label: "频次/小时数" }
    ];
  }
  
  // 默认 A 类聚类
  return [
    { key: "time", label: "时间" },
    { key: "drybulb", label: "等温干球温度 (℃)" },
    { key: "power", label: "设备电耗 (kW)" }
  ];
});

// 计算要展示的表格行数据列表
const tableRows = computed(() => {
  if (!props.rawData || !Array.isArray(props.rawData)) return [];
  
  const vType = props.visualType;
  
  return props.rawData.map((r, idx) => {
    if (vType === "C") {
      return {
        name: r.name || "—",
        dayA: r.dayA !== undefined ? r.dayA : "—",
        dayB: r.dayB !== undefined ? r.dayB : "—",
        delta: (r.delta > 0 ? "+" : "") + (r.delta !== undefined ? r.delta : "—")
      };
    }
    
    if (vType === "E") {
      return {
        hour: r.hour || "—",
        valA: r.valA !== undefined ? r.valA : "—",
        valB: r.valB !== undefined ? r.valB : "—"
      };
    }
    
    if (vType === "B") {
      return {
        index: idx + 1,
        drybulb: r.drybulb !== undefined ? r.drybulb : "—",
        power: r.energy !== undefined ? r.energy : "—"
      };
    }
    
    if (vType === "D") {
      return {
        range: r.range || "—",
        count: r.count !== undefined ? r.count : "—"
      };
    }
    
    // 默认 A
    return {
      time: r.hour ? r.hour.replace("T", " ") : "—",
      drybulb: props.targetTemp,
      power: r.energy !== undefined ? r.energy : "—"
    };
  });
});

const totalRowsCount = computed(() => tableRows.value.length);

// 动态导出 CSV 数据清单(含 BOM 防 Excel 乱码与安全转义)
const handleExportCSV = () => {
  if (tableRows.value.length === 0) return;

  const headers = columns.value.map(col => col.label);
  const csvRows = ["\uFEFF" + headers.join(",")];

  tableRows.value.forEach(row => {
    const values = columns.value.map(col => {
      const val = row[col.key];
      const valStr = val !== undefined && val !== null ? String(val).replace(/"/g, '""') : "";
      return valStr.includes(",") || valStr.includes("\n") || valStr.includes('"')
        ? `"${valStr}"`
        : valStr;
    });
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const winNum = props.windowIdx !== undefined ? props.windowIdx + 1 : 1;
  let periodStr = "";
  if (props.dateFrom) {
    periodStr = props.dateTo && props.dateTo !== props.dateFrom
      ? `${props.dateFrom}至${props.dateTo}`
      : props.dateFrom;
  }

  const fileName = periodStr 
    ? `窗口${winNum}_${periodStr}数据.csv` 
    : `窗口${winNum}_数据.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="raw-data-view" :style="{ minHeight: typeof minHeight === 'number' ? minHeight + 'px' : minHeight }">
    <div class="raw-data-hint">
      <Icon name="info" :size="11" stroke="var(--text-2)" />
      <span v-if="totalRowsCount > 0">数据源详细清单 · 共 <b class="mono">{{ totalRowsCount }}</b> 行</span>
      <span v-else>该窗口内暂无设备原始数据</span>
      <div class="raw-data-hint-actions" v-if="totalRowsCount > 0">
        <button class="text-link" @click="handleExportCSV"><Icon name="download" :size="11" /> 导出 CSV</button>
      </div>
    </div>
    <div class="raw-data-table-wrap">
      <table class="raw-data-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in tableRows" :key="i">
            <td v-for="col in columns" :key="col.key" class="mono">
              {{ r[col.key] }}
            </td>
          </tr>
          <tr v-if="totalRowsCount === 0">
            <td :colspan="columns.length" class="rd-table-empty" style="text-align: center; padding: 40px 0; color: var(--text-3);">
              暂无逐时明细记录
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
