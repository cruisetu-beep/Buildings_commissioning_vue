<script setup>
/* ═══════════════════════════════════════════════════════════════
   SortPriorityBar · 待调试楼宇筛选规则优先级设置控件
   模仿淘汰设备批次判断的加权调序交互,支持 1-3 级优先级的上移、下移、置顶、置底
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => ["hitRules", "eliminatedDevices", "carbonScore"]
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

const RULE_INFO = {
  hitRules: {
    title: "命中的待调试规则数",
    sortIcon: "sort-desc",
    sortText: "按规则数递减（命中规则多 -> 优先调适）"
  },
  eliminatedDevices: {
    title: "楼宇淘汰设备数",
    sortIcon: "sort-desc",
    sortText: "按设备数递减（淘汰设备多 -> 优先处置）"
  },
  carbonScore: {
    title: "楼宇碳效码评分",
    sortIcon: "sort-asc",
    sortText: "按评分递增（得分/等级低 -> 优先调适）"
  }
};

function updateList(newList) {
  emit("update:modelValue", newList);
  emit("change", newList);
}

function moveToTop(index) {
  if (index <= 0) return;
  const newList = [...props.modelValue];
  const item = newList.splice(index, 1)[0];
  newList.unshift(item);
  updateList(newList);
}

function moveUp(index) {
  if (index <= 0) return;
  const newList = [...props.modelValue];
  const temp = newList[index];
  newList[index] = newList[index - 1];
  newList[index - 1] = temp;
  updateList(newList);
}

function moveDown(index) {
  if (index >= props.modelValue.length - 1) return;
  const newList = [...props.modelValue];
  const temp = newList[index];
  newList[index] = newList[index + 1];
  newList[index + 1] = temp;
  updateList(newList);
}

function moveToBottom(index) {
  if (index >= props.modelValue.length - 1) return;
  const newList = [...props.modelValue];
  const item = newList.splice(index, 1)[0];
  newList.push(item);
  updateList(newList);
}
</script>

<template>
  <div class="sort-priority-bar">
    <div class="bar-title">
      <Icon name="filter" :size="15" stroke="var(--brand)" />
      <span>楼宇待调试判断规则优先级：</span>
    </div>

    <div class="priority-inline-row">
      <div
        v-for="(ruleKey, index) in modelValue"
        :key="ruleKey"
        class="priority-inline-item"
        :class="`rank-border-${index + 1}`"
      >
        <!-- 判定顺序数字（1、2、3） -->
        <div class="rank-badge-num" :class="`rank-bg-${index + 1}`">
          {{ index + 1 }}
        </div>

        <!-- 判定依据与描述图标 -->
        <div class="rule-label-group">
          <span class="rule-name">{{ RULE_INFO[ruleKey].title }}</span>
          <div class="sort-direction-icon" :title="RULE_INFO[ruleKey].sortText">
            <Icon
              :name="RULE_INFO[ruleKey].sortIcon"
              :size="14"
              stroke="var(--brand)"
            />
          </div>
        </div>

        <!-- 4 个控制按钮：置顶/上移/下移/置底 -->
        <div class="control-btn-group">
          <button
            class="ctrl-btn"
            :disabled="index === 0"
            title="优先级最高"
            @click="moveToTop(index)"
          >
            <Icon name="top-first" :size="13" />
          </button>
          <button
            class="ctrl-btn"
            :disabled="index === 0"
            title="优先级提高一级"
            @click="moveUp(index)"
          >
            <Icon name="arrow-up" :size="13" />
          </button>
          <button
            class="ctrl-btn"
            :disabled="index === modelValue.length - 1"
            title="优先级降低一级"
            @click="moveDown(index)"
          >
            <Icon name="arrow-down" :size="13" />
          </button>
          <button
            class="ctrl-btn"
            :disabled="index === modelValue.length - 1"
            title="优先级最低"
            @click="moveToBottom(index)"
          >
            <Icon name="bottom-last" :size="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sort-priority-bar {
  background: #ffffff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(60, 110, 200, 0.04);
}

.bar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-0, #1e293b);
  white-space: nowrap;
}

.priority-inline-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.priority-inline-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #f8faff;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.priority-inline-item:hover {
  background: #ffffff;
  border-color: var(--brand, #2f7fff);
  box-shadow: 0 2px 8px rgba(47, 127, 255, 0.08);
}

.rank-border-1 { border-left: 3px solid #1f6feb; }
.rank-border-2 { border-left: 3px solid #7a5cff; }
.rank-border-3 { border-left: 3px solid #18a572; }

.rank-badge-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.rank-bg-1 { background: rgba(31, 111, 235, 0.15); color: #1f6feb; }
.rank-bg-2 { background: rgba(122, 92, 255, 0.15); color: #7a5cff; }
.rank-bg-3 { background: rgba(24, 165, 114, 0.15); color: #18a572; }

.rule-label-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.rule-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-0, #1e293b);
  white-space: nowrap;
}

.sort-direction-icon {
  display: grid;
  place-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: #eef4ff;
  cursor: help;
}

.control-btn-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ctrl-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--line-strong, #cbd5e1);
  background: #ffffff;
  color: var(--text-1, #64748b);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  transition: all 0.15s;
}

.ctrl-btn:hover:not(:disabled) {
  background: var(--brand, #2f7fff);
  color: #ffffff;
  border-color: var(--brand, #2f7fff);
}

.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
