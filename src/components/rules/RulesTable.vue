<script setup>
/* ═══════════════════════════════════════════════════════════════
   RulesTable · 主表格
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";
import SeriesTag from "../common/SeriesTag.vue";
import CategoryChip from "../common/CategoryChip.vue";
import PriorityChip from "../common/PriorityChip.vue";
import ToggleSwitch from "../common/ToggleSwitch.vue";

const props = defineProps({
  rules: { type: Array, required: true },
  selectedIds: { type: Array, required: true },
  allSelected: { type: Boolean, required: true },
  sSeriesLocked: { type: Boolean, default: false },
});
const emit = defineEmits(["toggle-select", "toggle-select-all", "toggle-enable", "edit"]);
</script>

<template>
  <div v-if="rules.length === 0" class="table-empty">
    <Icon name="filter" :size="32" stroke="#c5cee0" />
    <div>没有匹配的规则</div>
    <div class="empty-sub">尝试调整筛选条件或搜索关键词</div>
  </div>

  <div v-else class="rules-table-wrap" :class="{ 's-locked': sSeriesLocked }">
    <table class="rules-table">
      <thead>
        <tr>
          <th class="col-check">
            <input
              type="checkbox"
              :checked="allSelected"
              :disabled="sSeriesLocked"
              @change="emit('toggle-select-all', $event.target.checked)"
            />
          </th>
          <th class="col-id">规则编号</th>
          <th class="col-code">分类编码</th>
          <th class="col-series">系列</th>
          <th class="col-name">规则名称</th>
          <th class="col-category">设备类别</th>
          <th class="col-priority">优先级</th>
          <th class="col-node">所需计量节点</th>
          <th class="col-window">窗口配置</th>
          <th class="col-status">启用状态</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rules" :key="r.cxRuleId" :class="{ 'row-locked': sSeriesLocked }">
          <td class="col-check">
            <input
              type="checkbox"
              :checked="selectedIds.includes(r.cxRuleId)"
              :disabled="sSeriesLocked"
              @change="emit('toggle-select', r.cxRuleId)"
            />
          </td>
          <td class="col-id mono">{{ r.cxRuleId }}</td>
          <td class="col-code"><span class="code-badge mono">{{ r.ruleCode }}</span></td>
          <td class="col-series"><SeriesTag :series="r.series" /></td>
          <td class="col-name">
            <div class="name-main">{{ r.name }}</div>
            <div class="name-brief" :title="r.brief">{{ r.brief }}</div>
          </td>
          <td class="col-category"><CategoryChip :category="r.category" /></td>
          <td class="col-priority"><PriorityChip :priority="r.priority" /></td>
          <td class="col-node mono">{{ r.nodeReq }}</td>
          <td class="col-window mono">
            <span class="window-cfg">
              <span class="w-num">{{ r.minValid }}</span>
              <span class="w-sep">/</span>
              <span class="w-num">{{ r.minPass }}</span>
            </span>
            <span class="window-hint">有效/触发</span>
          </td>
          <td class="col-status">
            <ToggleSwitch
              :model-value="r.isEnabled"
              :disabled="sSeriesLocked"
              disabled-reason="S系规则当前批次未启用"
              @update:model-value="(v) => emit('toggle-enable', r.cxRuleId, v)"
            />
          </td>
          <td class="col-action">
            <button class="row-action-btn" title="编辑规则" @click="emit('edit', r)">
              <Icon name="edit" :size="14" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
