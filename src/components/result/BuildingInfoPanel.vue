<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingInfoPanel · 建筑元信息 + 节点覆盖
   建筑基本信息 / 计量节点覆盖 两张卡默认收起,展开互斥(同一时刻只能开一张)。
   ═══════════════════════════════════════════════════════════════ */
import { ref, computed } from "vue";
import Icon from "../icons/Icon.vue";
import BuildFuncTag from "../common/BuildFuncTag.vue";
import { genBuildingMeta } from "../../data/building-detail-data.js";

const props = defineProps({
  building: { type: Object, required: true },
  nodes: { type: Array, required: true },
});

const meta = computed(() => genBuildingMeta(props.building));
const availCount = computed(() => props.nodes.filter((n) => n.available).length);

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
        <dt>冷源配置</dt>
        <dd>{{ meta.chillerType }}</dd>
        <dt>末端形式</dt>
        <dd>{{ meta.ahuType }}</dd>
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
        <span class="bip-card-hint mono">{{ availCount }}/{{ nodes.length }}</span>
        <span class="bip-chev" :class="{ open: nodeOpen }">
          <Icon name="chevron-d" :size="13" stroke="var(--text-2)" />
        </span>
      </div>
      <div v-if="nodeOpen" class="node-cov-list">
        <div v-for="n in nodes" :key="n.code" class="node-cov-row" :class="{ missing: !n.available }">
          <span class="node-check" :class="n.available ? 'on' : 'off'">
            <Icon v-if="n.available" name="check" :size="10" stroke="#fff" />
            <Icon v-else name="x" :size="10" stroke="#fff" />
          </span>
          <span class="node-code mono">{{ n.code }}</span>
          <span class="node-name">{{ n.name }}</span>
          <span class="node-cat">{{ n.category }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
