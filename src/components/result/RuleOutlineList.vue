<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleOutlineList · 左栏规则命中大纲
   按判定分类分组折叠,当前规则高亮
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import CategoryStatusChip from "../common/CategoryStatusChip.vue";

const props = defineProps({
  results: { type: Array, required: true },
  activeCode: { type: String, default: null },
});
const emit = defineEmits(["select"]);

const groupOrder = ["目标调适", "待核查", "正常", "无节点"];
const groups = computed(() => ({
  "目标调适": props.results.filter((r) => r.category === "目标调适"),
  "待核查": props.results.filter((r) => r.category === "待核查"),
  "正常": props.results.filter((r) => r.category === "正常"),
  "无节点": props.results.filter((r) => r.category === "无节点"),
}));

const expanded = ref(new Set(["目标调适", "待核查"]));
const toggleGroup = (g) => {
  const next = new Set(expanded.value);
  if (next.has(g)) next.delete(g);
  else next.add(g);
  expanded.value = next;
};
</script>

<template>
  <div class="rule-outline card">
    <div class="ro-header">
      <div class="ro-title">
        <Icon name="list" :size="13" stroke="var(--brand)" />
        <span>规则命中总览</span>
      </div>
      <div class="ro-subtitle mono">
        {{ results.length }} 条规则 · {{ groups["目标调适"].length }} 触发
      </div>
    </div>

    <div class="ro-body">
      <template v-for="g in groupOrder" :key="g">
        <div v-if="groups[g].length > 0" class="ro-group">
          <button class="ro-group-head" @click="toggleGroup(g)">
            <Icon :name="expanded.has(g) ? 'chevron-d' : 'chevron-r'" :size="11" />
            <CategoryStatusChip :category="g" />
            <span class="ro-group-count mono">{{ groups[g].length }}</span>
          </button>
          <div v-if="expanded.has(g)" class="ro-items">
            <button
              v-for="item in groups[g]"
              :key="item.ruleCode"
              class="ro-item"
              :class="{ active: activeCode === item.ruleCode, dim: item.category !== '目标调适' }"
              @click="emit('select', item.ruleCode)"
            >
              <span class="ro-item-code mono" :class="`series-${item.series}`">{{ item.ruleCode }}</span>
              <span class="ro-item-name">{{ item.ruleName }}</span>
              <span
                v-if="item.validCount > 0"
                class="ro-item-ratio mono"
                :title="`触发 ${item.triggerCount} / 有效 ${item.validCount}`"
              >
                {{ item.triggerCount }}/{{ item.validCount }}
              </span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
