<script setup>
/* ═══════════════════════════════════════════════════════════════
   FilterBar · 搜索 + 优先级 + 状态 + 批量操作
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

defineProps({
  filteredCount: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  selectedCount: { type: Number, required: true },
  sSeriesReadOnly: { type: Boolean, default: false },
});
const emit = defineEmits(["bulk-enable", "bulk-disable"]);

const filters = defineModel({ required: true }); // { q, priority, enabled }
</script>

<template>
  <div class="filter-bar">
    <div class="filter-left">
      <div class="search-wrap">
        <Icon name="search" :size="14" stroke="#97a4c0" />
        <input
          class="search-input"
          placeholder="搜索规则编号 / 分类编码 / 名称"
          v-model="filters.q"
        />
        <button v-if="filters.q" class="search-clear" title="清空" @click="filters.q = ''">
          <Icon name="x" :size="12" />
        </button>
      </div>

      <div class="filter-group">
        <label class="filter-label">优先级</label>
        <select class="filter-select" v-model="filters.priority">
          <option value="all">全部</option>
          <option value="最高">最高</option>
          <option value="高">高</option>
          <option value="中">中</option>
          <option value="低">低</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">启用状态</label>
        <select class="filter-select" v-model="filters.enabled">
          <option value="all">全部</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已停用</option>
        </select>
      </div>

      <div class="filter-count mono">{{ filteredCount }} / {{ totalCount }}</div>
    </div>

    <div class="filter-right">
      <template v-if="selectedCount > 0">
        <span class="selected-info mono">已选 {{ selectedCount }} 条</span>
        <button
          class="btn ghost sm"
          :disabled="sSeriesReadOnly"
          :title="sSeriesReadOnly ? 'S系规则当前批次不允许启用' : ''"
          @click="emit('bulk-enable')"
        >
          <Icon name="check" :size="13" /> 批量启用
        </button>
        <button
          class="btn ghost sm"
          :disabled="sSeriesReadOnly"
          :title="sSeriesReadOnly ? 'S系规则当前批次不允许操作' : ''"
          @click="emit('bulk-disable')"
        >
          <Icon name="x" :size="13" /> 批量停用
        </button>
      </template>
    </div>
  </div>
</template>
