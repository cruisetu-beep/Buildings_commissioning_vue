<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingCard · 建筑卡片
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import BuildFuncTag from "../common/BuildFuncTag.vue";
import HitCountBadge from "../common/HitCountBadge.vue";
import RuleChipsRow from "../common/RuleChipsRow.vue";
import CategoryStatusChip from "../common/CategoryStatusChip.vue";
import ArchiveStatusChip from "../common/ArchiveStatusChip.vue";
import Icon from "../icons/Icon.vue";

const props = defineProps({
  building: { type: Object, required: true },
});
defineEmits(["click"]);

const dimmed = computed(() => props.building.category === "无节点" || props.building.category === "无数据");
</script>

<template>
  <div class="bld-card" :class="{ dimmed }" @click="$emit('click')">
    <div class="bld-card-corner-tl" />
    <div class="bld-card-corner-br" />

    <div class="bld-card-top">
      <div class="bld-card-id-row">
        <span class="bld-id mono">{{ building.buildId }}</span>
        <BuildFuncTag :func="building.buildFunc" :func-name="building.buildFuncName" />
      </div>
      <HitCountBadge :count="building.hitCount" size="md" />
    </div>

    <div class="bld-card-name">{{ building.name }}</div>

    <div class="bld-card-rules">
      <div class="bld-card-rules-label">
        命中规则
        <span class="rules-hint">{{ building.hitRules.length > 0 ? "(排除D01)" : "" }}</span>
      </div>
      <RuleChipsRow :rules="building.hitRules" :max-show="8" />
    </div>

    <div class="bld-card-foot">
      <div class="bld-foot-left">
        <CategoryStatusChip :category="building.category" />
        <span v-if="building.nodeCoverage !== '完整'" class="node-warn mono" :title="`节点覆盖:${building.nodeCoverage}`">
          <Icon name="alert" :size="10" stroke="#d97706" />
          节点{{ building.nodeCoverage }}
        </span>
      </div>
      <ArchiveStatusChip :status="building.status" />
    </div>
  </div>
</template>
