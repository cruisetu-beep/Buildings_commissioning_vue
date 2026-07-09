<script setup>
/* ═══════════════════════════════════════════════════════════════
   PlaceholderPage · 尚未迁移到 Vue 的模块占位页
   本批次(第一步)仅迁移"判定规则"模块,其余模块保留占位,
   后续批次会逐个替换为对应的 Vue 页面。
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import { useRoute } from "vue-router";
import Breadcrumb from "../components/layout/Breadcrumb.vue";
import Icon from "../components/icons/Icon.vue";
import { MODULES } from "../constants/modules.js";

const route = useRoute();
const moduleKey = computed(() => route.path.split("/")[1] || "");
const module = computed(() => MODULES.find((m) => m.key === moduleKey.value));
</script>

<template>
  <div class="page-view float-in">
    <Breadcrumb :items="['楼宇调适分析工作台', module?.label || '模块']" />
    <div class="placeholder-card card glow">
      <div class="placeholder-icon"><Icon :name="module?.icon || 'layers'" :size="42" stroke="var(--brand)" /></div>
      <h2 class="placeholder-title">{{ module?.label }}</h2>
      <div class="placeholder-desc">
        该模块尚未迁移到 Vue 版本(判定规则模块为本批次迁移的第一步)。<br />
        <span class="ph-list mono">1.1 规则清单 · 1.2 规则详情 已完成迁移</span>
      </div>
      <div class="placeholder-status">
        <Icon name="alert" :size="13" stroke="#d97706" />
        <span>WORK IN PROGRESS · 待后续批次迁移</span>
      </div>
    </div>
  </div>
</template>
