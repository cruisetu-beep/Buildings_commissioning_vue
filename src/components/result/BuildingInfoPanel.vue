<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingInfoPanel · 建筑元信息 + 节点覆盖
   建筑基本信息 / 计量节点覆盖 两张卡默认收起,展开互斥(同一时刻只能开一张)。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import BuildFuncTag from "../common/BuildFuncTag.vue";

const props = defineProps({
  building: { type: Object, required: true },
  nodes: { type: Array, required: true },
  activeResult: { type: Object, default: null }
});

const activeRequiredCodes = computed(() => {
  if (props.activeResult && props.activeResult.requiredNodeTypes) {
    return props.activeResult.requiredNodeTypes
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
  }
  return [];
});

const linkedNodes = computed(() => {
  const activeModelNodes = props.activeResult && props.activeResult.modelNodes
          ? props.activeResult.modelNodes
          : [];

  return props.nodes
          .map((n) => {
            const fullNodeId = `${props.building.buildId}X00${n.code}`;
            const found = activeModelNodes.find((mn) => mn.modelNodeId === fullNodeId);

            // 是否是当前选中规则需要的节点类型 (如果 activeRequiredCodes 为空，代表当前规则没有限制，默认展示全部)
            const isRequired = activeRequiredCodes.value.length === 0 || activeRequiredCodes.value.includes(n.code);
            const isAvailable = isRequired && !!found;

            return {
              ...n,
              available: isAvailable,
              isRequired,
              modelNodeName: found && found.modelNodeName ? found.modelNodeName : n.name,
              parentNodeName: found ? found.parentNodeName : "—"
            };
          })
          .filter((n) => n.isRequired);
});

const availCount = computed(() => linkedNodes.value.filter((n) => n.available).length);
const totalRequiredCount = computed(() => {
  return activeRequiredCodes.value.length > 0
          ? activeRequiredCodes.value.length
          : props.nodes.length;
});

const meta = computed(() => {
  return {
    area: props.building.area || "—",
    floors: props.building.floors || "—",
    year: props.building.year || "—"
  };
});

// 两张卡默认收起,展开互斥 · 同一时刻只能开一张
// 值:null | "info" | "node"
const expanded = ref(null);
const infoOpen = computed(() => expanded.value === "info");
const nodeOpen = computed(() => expanded.value === "node");
const toggle = (key) => {
  expanded.value = expanded.value === key ? null : key;
};
</script>

<template>
  <div class="bip-wrap">
    <!-- 建筑基本信息 -->
    <div class="card bip-card" :class="{ collapsed: !infoOpen }">
      <div
        class="bip-card-title"
        role="button"
        tabindex="0"
        @click="toggle('info')"
        @keydown.enter.prevent="toggle('info')"
        @keydown.space.prevent="toggle('info')"
      >
        <Icon name="building" :size="13" stroke="var(--brand)" />
        <span>建筑基本信息</span>
        <span class="bip-chev" :class="{ open: infoOpen }">
          <Icon name="chevron-d" :size="13" stroke="var(--text-2)" />
        </span>
      </div>
      <dl v-if="infoOpen" class="bip-list">
        <dt>建筑编号</dt>
        <dd class="mono">{{ building.buildId }}</dd>
        <dt>业态</dt>
        <dd><BuildFuncTag :func="building.buildFunc" :func-name="building.buildFuncName" /></dd>
        <dt>建筑面积</dt>
        <dd class="mono">{{ meta.area }} m²</dd>
        <dt>楼层</dt>
        <dd>{{ meta.floors }}</dd>
        <dt>建成年份</dt>
        <dd class="mono">{{ meta.year }}</dd>
      </dl>
    </div>

    <!-- 计量节点覆盖 -->
    <div class="card bip-card" :class="{ collapsed: !nodeOpen }">
      <div
        class="bip-card-title"
        role="button"
        tabindex="0"
        @click="toggle('node')"
        @keydown.enter.prevent="toggle('node')"
        @keydown.space.prevent="toggle('node')"
      >
        <Icon name="layers" :size="13" stroke="var(--brand)" />
        <span>计量节点覆盖</span>
        <span class="bip-card-hint mono">{{ availCount }}/{{ totalRequiredCount }}</span>
        <span class="bip-chev" :class="{ open: nodeOpen }">
          <Icon name="chevron-d" :size="13" stroke="var(--text-2)" />
        </span>
      </div>
      <div v-if="nodeOpen" class="node-cov-list">
        <div v-for="n in linkedNodes" :key="n.code" class="node-cov-row" :class="{ missing: !n.available }">
          <span class="node-check" :class="n.available ? 'on' : 'off'">
            <Icon v-if="n.available" name="check" :size="10" stroke="#fff" />
            <Icon v-else name="x" :size="10" stroke="#fff" />
          </span>
          <span class="node-code mono">{{ n.code }}</span>
          <span class="node-name">{{ n.modelNodeName }}</span>
          <span class="node-cat" :title="n.parentNodeName">{{ n.parentNodeName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
