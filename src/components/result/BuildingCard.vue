<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingCard · 建筑卡片(台账式精修版,依据 Claude Design 设计稿重做)
   自包含组件:样式全部 scoped,不复用 common/ 下的共享徽章组件,
   避免影响建筑详情页(BuildingDetailPage / BuildingInfoPanel)对
   这些共享组件的复用。
   ═══════════════════════════════════════════════════════════════ */
import { computed, onMounted } from "vue";
import { ruleNameMapRef, initRuleMetaMap } from "../../data/rules-api.js";

const props = defineProps({
  building: { type: Object, required: true },
});
defineEmits(["click"]);

onMounted(() => {
  initRuleMetaMap();
});

const dimmed = computed(() => props.building.category === "无节点" || props.building.category === "无数据");

/* ─── 命中数量分级色 ───
   4/5/6/7 四档严格取自设计稿 token;0 与 1-3 是设计稿未覆盖的
   区间,按"更低数量可沿色阶外推"的说明,外推成中性灰档。 */
const SEV_STEPS = [
  { min: 7, fg: "#e11d48", bg: "#fff1f2", bd: "#fecdd3" }, // 设计稿:7 条
  { min: 6, fg: "#ea580c", bg: "#fff7ed", bd: "#fed7aa" }, // 设计稿:6 条
  { min: 5, fg: "#d97706", bg: "#fffbeb", bd: "#fde68a" }, // 设计稿:5 条
  { min: 4, fg: "#ca8a04", bg: "#fefce8", bd: "#fef08a" }, // 设计稿:4 条
  { min: 1, fg: "#64748b", bg: "#f8fafc", bd: "#e2e8f0" }, // 外推:1-3 条
  { min: 0, fg: "#94a3b8", bg: "#f8fafc", bd: "#e2e8f0" }, // 外推:0 条
];
const sev = computed(() => SEV_STEPS.find((s) => props.building.hitCount >= s.min));

/* ─── 楼宇类型色 ───
   BA/BB/AA 严格取自设计稿 token;其余业态代码设计稿未覆盖,
   沿用现有 BuildFuncTag 的色相自行扩展为同风格浅底配色。 */
const TYPE_COLORS = {
  AA: { fg: "#4f46e5", bg: "#eef2ff", bd: "#e0e7ff" }, // 设计稿
  BA: { fg: "#1d4ed8", bg: "#eff6ff", bd: "#dbeafe" }, // 设计稿
  BB: { fg: "#c2410c", bg: "#fff7ed", bd: "#fed7aa" }, // 设计稿
  BC: { fg: "#7c3aed", bg: "#f5f3ff", bd: "#ede9fe" }, // 外推
  BD: { fg: "#be185d", bg: "#fdf2f8", bd: "#fbcfe8" }, // 外推
  BE: { fg: "#059669", bg: "#ecfdf5", bd: "#a7f3d0" }, // 外推
  BF: { fg: "#d97706", bg: "#fffbeb", bd: "#fde68a" }, // 外推
  BH: { fg: "#0891b2", bg: "#ecfeff", bd: "#a5f3fc" }, // 外推
  BI: { fg: "#6b21a8", bg: "#faf5ff", bd: "#e9d5ff" }, // 外推
  BJ: { fg: "#4338ca", bg: "#eef2ff", bd: "#c7d2fe" }, // 外推
  BZ: { fg: "#64748b", bg: "#f8fafc", bd: "#e2e8f0" }, // 外推
  BY: { fg: "#94a3b8", bg: "#f8fafc", bd: "#e2e8f0" }, // 外推
};
const typeColor = computed(() => TYPE_COLORS[props.building.buildFunc] || TYPE_COLORS.BZ);

/* ─── 判定结果配色 ───
   设计稿示例只画了"目标调适"(红),其余分类沿用现有
   CategoryStatusChip 里已定义的颜色,套到新的"色点+文字"样式上。 */
const VERDICT_COLORS = {
  "目标调适": "#e11d48",
  "待核查": "#0ea5e9",
  "正常": "#18a572",
  "无节点": "#94a3b8",
  "无数据": "#cbd5e1",
};
const verdictColor = computed(() => VERDICT_COLORS[props.building.category] || "#94a3b8");

/* 规则码首字母决定颜色:C 蓝 / D 紫,与设计稿一致 */
function ruleClass(code) {
  if (code.startsWith("C")) return "rule c";
  if (code.startsWith("D")) return "rule d";
  return "rule";
}
</script>

<template>
  <div
    class="card"
    :class="{ dimmed }"
    :style="{ borderTopColor: sev.fg }"
    @click="$emit('click')"
  >
    <div class="head">
      <div class="head-left">
        <div class="name" :title="building.name">{{ building.name }}</div>
        <div class="meta">
          <span class="code mono">{{ building.buildId }}</span>
          <span class="dot" />
          <span
            class="type"
            :style="{ color: typeColor.fg, background: typeColor.bg, borderColor: typeColor.bd }"
          >
            <b class="mono">{{ building.buildFunc }}</b><span>{{ building.buildFuncName }}</span>
          </span>
        </div>
      </div>
      <div class="sev" :style="{ color: sev.fg, background: sev.bg, borderColor: sev.bd }">
        <div class="sev-num mono">{{ building.hitCount }}</div>
        <div class="sev-lbl">命中</div>
      </div>
    </div>

    <div class="divider a" />

    <div class="sec-title">命中规则</div>
    <div class="rules">
      <span v-if="building.hitRules.length === 0" class="rules-empty">— 无命中规则</span>
      <span
        v-for="code in building.hitRules"
        :key="code"
        :class="ruleClass(code)"
        :title="ruleNameMapRef[code] || code"
      >{{ code }}</span>
    </div>

    <div class="divider b" />

    <div class="verdict-row">
      <span class="verdict-lbl">判定结果</span>
      <span class="verdict" :style="{ color: verdictColor }">
        <span
          class="verdict-dot"
          :style="{ background: verdictColor, boxShadow: `0 0 0 3px ${verdictColor}1f` }"
        />
        {{ building.category }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border: 1.5px solid #cbd5e1;
  border-top: 2px solid;
  border-radius: 12px;
  padding: 15px 16px 13px;
  max-width: 420px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}
.card:hover {
  border-color: #94a3b8;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 14px 32px -18px rgba(15, 23, 42, 0.4);
  transform: translateY(-2px);
}
.card.dimmed { opacity: 0.62; }

.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.head-left { min-width: 0; }
.name {
  font-size: 17px; font-weight: 700; letter-spacing: 0.2px; line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.meta { margin-top: 7px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.code { font-size: 12px; color: #64748b; letter-spacing: 0.4px; }
.dot { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; flex: none; }
.type {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px;
  padding: 1px 7px; border-radius: 5px; border: 1px solid;
}
.type b { font-weight: 600; letter-spacing: 0.5px; }

.sev {
  flex: none; text-align: center; padding: 7px 12px; border-radius: 10px; min-width: 54px;
  border: 1.5px solid;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.card:hover .sev {
  transform: scale(1.12);
  border-color: currentColor;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.12), 0 10px 22px -8px currentColor;
}
.sev-num { font-size: 23px; font-weight: 600; line-height: 1; }
.sev-lbl { font-size: 9.5px; margin-top: 3px; letter-spacing: 2px; opacity: 0.9; }

.divider { height: 1px; background: #eef1f5; }
.divider.a { margin: 12px 0 11px; }
.divider.b { margin: 12px 0 10px; }

.sec-title { font-size: 12px; font-weight: 600; color: #475569; letter-spacing: 0.5px; margin-bottom: 9px; }
.rules { display: flex; flex-wrap: wrap; gap: 5px; }
.rule {
  font-size: 12px; font-weight: 500;
  padding: 2px 7px; border-radius: 5px; letter-spacing: 0.5px;
}
.rule.c { color: #1d4ed8; background: #eff6ff; border: 1px solid #dbeafe; }
.rule.d { color: #6d28d9; background: #f5f3ff; border: 1px solid #ede9fe; }
.rules-empty { font-size: 11px; color: #94a3b8; font-style: italic; }

.verdict-row { display: flex; align-items: center; justify-content: space-between; }
.verdict-lbl { font-size: 12px; color: #94a3b8; }
.verdict { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
.verdict-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }

/* 等宽字体统一走全局 .mono(已在 shared.css 里定义为 JetBrains Mono) */
</style>
