<script setup>
/* ═══════════════════════════════════════════════════════════════
   BuildingInfoPanel · 右栏 · 建筑元信息 + 节点覆盖 + 调适档案
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import BuildFuncTag from "../common/BuildFuncTag.vue";
import ArchiveStatusChip from "../common/ArchiveStatusChip.vue";
import { genBuildingMeta } from "../../data/building-detail-data.js";

const props = defineProps({
  building: { type: Object, required: true },
  nodes: { type: Array, required: true },
});

const meta = computed(() => genBuildingMeta(props.building));
const availCount = computed(() => props.nodes.filter((n) => n.available).length);
</script>

<template>
  <div class="bip-wrap">
    <!-- 建筑基本信息 -->
    <div class="card bip-card">
      <div class="bip-card-title">
        <Icon name="building" :size="13" stroke="var(--brand)" />
        <span>建筑基本信息</span>
      </div>
      <dl class="bip-list">
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
    <div class="card bip-card">
      <div class="bip-card-title">
        <Icon name="layers" :size="13" stroke="var(--brand)" />
        <span>计量节点覆盖</span>
        <span class="bip-card-hint mono">{{ availCount }}/{{ nodes.length }}</span>
      </div>
      <div class="node-cov-list">
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

    <!-- 调适档案 -->
    <div class="card bip-card">
      <div class="bip-card-title">
        <Icon name="lightbulb" :size="13" stroke="var(--brand)" />
        <span>调适档案</span>
        <ArchiveStatusChip :status="building.status" />
      </div>

      <div v-if="building.status === '已调适'" class="archive-info">
        <div class="ai-row">
          <span class="ai-label">调适年份</span>
          <span class="ai-value mono">2023</span>
        </div>
        <div class="ai-row">
          <span class="ai-label">措施类别</span>
          <div class="ai-tags">
            <span class="ai-tag">制冷系统调适</span>
            <span class="ai-tag">输配变频优化</span>
            <span class="ai-tag">BA自控优化</span>
          </div>
        </div>
        <div class="ai-row">
          <span class="ai-label">节能率</span>
          <span class="ai-value mono" style="color: var(--ok)">-12.4%</span>
        </div>
      </div>
      <div v-else-if="building.status === '待调适'" class="archive-info-empty">
        <Icon name="target" :size="20" stroke="var(--warn)" />
        <div>已列入 <b>待调适</b> 名单</div>
        <div class="aie-sub">建议在下一调适批次纳入实施</div>
      </div>
      <div v-else class="archive-info-empty">
        <Icon name="info" :size="20" stroke="var(--text-3)" />
        <div>暂未登记调适档案</div>
        <div class="aie-sub">可根据判定结果生成调适建议</div>
      </div>

      <button class="btn ghost bip-generate-btn">
        <Icon name="lightbulb" :size="13" />
        {{ building.status === "未登记" ? "生成调适建议" : "查看/更新建议" }}
        <span class="ql-sub"> → 6.2(待第二批)</span>
      </button>
    </div>
  </div>
</template>
