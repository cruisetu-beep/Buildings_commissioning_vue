<script setup>
/* ═══════════════════════════════════════════════════════════════
   RuleOutlineV2 · 判定结果 v2 左栏大纲

   与旧版 RuleOutlineList 的区别：
   - 五个判定分组各自可展开收起
   - 计数分三级权重：目标调适 / 正常为实心徽标，待核查次之，
     无节点 / 无数据弱化（避免"无节点 8"这种大数字盖过"目标调适 4"）
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed, watch } from "vue";
import { ruleNameMapRef } from "../../../data/rules-api.js";

const props = defineProps({
  results: { type: Array, default: () => [] },
  activeCode: { type: String, default: "" },
});
defineEmits(["select"]);

/* 顺序与默认展开状态：有结论的在上并展开，缺数据的在下并收起 */
const GROUPS = [
  { key: "目标调适", cls: "target", n: "key k-target", open: true, muted: false },
  { key: "正常", cls: "normal", n: "key k-normal", open: true, muted: true },
  { key: "待核查", cls: "check", n: "sub", open: true, muted: true },
  { key: "配置错误", cls: "warn", n: "sub", open: false, muted: true },
  { key: "数据异常", cls: "warn", n: "sub", open: false, muted: true },
  { key: "虚拟预测愈合", cls: "heal", n: "sub", open: false, muted: true },
  { key: "无节点", cls: "muted", n: "weak", open: false, muted: true },
  { key: "无数据", cls: "muted", n: "weak", open: false, muted: true },
];

const openMap = ref({});
GROUPS.forEach((g) => (openMap.value[g.key] = g.open));

/* 只渲染有内容的分组，避免出现一排空组头 */
const groups = computed(() =>
  GROUPS.map((g) => ({ ...g, items: props.results.filter((r) => r.category === g.key) })).filter(
    (g) => g.items.length > 0
  )
);

const total = computed(() => props.results.length);
const hitCount = computed(() => props.results.filter((r) => r.category === "目标调适").length);

/* 选中的规则若落在收起的分组里，自动展开该组，避免高亮行看不见 */
watch(
  () => props.activeCode,
  (code) => {
    if (!code) return;
    const hit = props.results.find((r) => r.ruleCode === code);
    if (hit && openMap.value[hit.category] === false) openMap.value[hit.category] = true;
  }
);

function ruleName(r) {
  return r.ruleName || ruleNameMapRef[r.ruleCode] || r.ruleCode;
}
function frac(r) {
  if (r.hitWindows === undefined || r.totalWindows === undefined) return "—";
  return `${r.hitWindows}/${r.totalWindows}`;
}
</script>

<template>
  <div class="v2-outline">
    <div class="v2-outline-t">规则命中总览</div>
    <div class="v2-outline-sub">{{ total }} 条规则 · {{ hitCount }} 触发</div>

    <div
      v-for="g in groups"
      :key="g.key"
      class="v2-grp"
      :class="{ open: openMap[g.key] }"
    >
      <div class="v2-grp-top" @click="openMap[g.key] = !openMap[g.key]">
        <span class="v2-grp-ar">▶</span>
        <span class="v2-grp-h" :class="`gh-${g.cls}`">{{ g.key }}</span>
        <span class="v2-grp-n" :class="g.n">{{ g.items.length }}</span>
      </div>
      <div class="v2-grp-b">
        <div
          v-for="r in g.items"
          :key="r.ruleCode"
          class="v2-rule-row"
          :class="{ active: r.ruleCode === activeCode, muted: g.muted && r.ruleCode !== activeCode }"
          :title="ruleName(r)"
          @click="$emit('select', r.ruleCode)"
        >
          <span class="code">{{ r.ruleCode }}</span>
          <span class="nm">{{ ruleName(r) }}</span>
          <span class="frac">{{ frac(r) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!groups.length" class="v2-outline-empty">暂无判定结果</div>
  </div>
</template>
