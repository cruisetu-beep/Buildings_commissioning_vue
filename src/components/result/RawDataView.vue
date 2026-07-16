<script setup>
/* ═══════════════════════════════════════════════════════════════
   RawDataView · 原始逐时数据表(嵌入图表区,替换图表显示)
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";
import { RAW_HOURLY_DATA } from "../../data/viz-data.js";

defineProps({
  minHeight: { type: [String, Number], default: 420 },
});

const showRows = 24;

function statusClass(status) {
  return status === "关机" ? "st-off" : status === "低负荷" ? "st-low" : "st-on";
}
</script>

<template>
  <div class="raw-data-view" :style="{ minHeight: typeof minHeight === 'number' ? minHeight + 'px' : minHeight }">
    <div class="raw-data-hint">
      <Icon name="info" :size="11" stroke="var(--text-2)" />
      <span
        >该窗口内的原始逐时气象与设备电耗数据 · 共 <b class="mono">{{ RAW_HOURLY_DATA.length }}</b> 行 ·
        当前显示前 {{ showRows }} 行</span
      >
      <div class="raw-data-hint-actions">
        <button class="text-link"><Icon name="download" :size="11" /> 导出 CSV</button>
        <button class="text-link"><Icon name="layers" :size="11" /> 连接查询节点</button>
      </div>
    </div>
    <div class="raw-data-table-wrap">
      <table class="raw-data-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>干球 (℃)</th>
            <th>湿球 (℃)</th>
            <th>设备电耗 (kW)</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in RAW_HOURLY_DATA.slice(0, showRows)" :key="i">
            <td class="mono">{{ r.time }}</td>
            <td class="mono">{{ r.drybulb }}</td>
            <td class="mono">{{ r.wetbulb }}</td>
            <td class="mono">{{ r.power }}</td>
            <td>
              <span class="status-tag" :class="statusClass(r.status)">{{ r.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
