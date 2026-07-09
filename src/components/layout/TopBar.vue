<script setup>
/* ═══════════════════════════════════════════════════════════════
   TopBar · 顶部导航栏
   品牌 + 7 模块菜单 + 状态/铃铛/设置/用户
   ═══════════════════════════════════════════════════════════════ */
import { useRouter, useRoute } from "vue-router";
import { MODULES } from "../../constants/modules.js";
import Icon from "../icons/Icon.vue";

const router = useRouter();
const route = useRoute();

const isActive = (key) => route.path === "/" + key || route.path.startsWith("/" + key + "/");

const onNav = (m) => {
  router.push("/" + m.key);
};
</script>

<template>
  <div class="topbar">
    <div class="topbar-left">
      <div class="brand">
        <div class="brand-mark">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#4dc9ff" />
                <stop offset="100%" stop-color="#2f7fff" />
              </linearGradient>
            </defs>
            <!-- 楼宇外轮廓 -->
            <path d="M6 27V11l10-6 10 6v16" stroke="url(#bg-grad)" stroke-width="1.6" fill="rgba(47,127,255,0.08)" />
            <!-- 楼宇窗户网格 -->
            <rect x="9" y="14" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.8" />
            <rect x="14" y="14" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.4" />
            <rect x="19" y="14" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.8" />
            <rect x="9" y="19" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.4" />
            <rect x="14" y="19" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.8" />
            <rect x="19" y="19" width="2.5" height="2.5" fill="#4dc9ff" opacity="0.4" />
            <!-- 顶部信号 -->
            <circle cx="16" cy="5" r="1.5" fill="#4dc9ff" />
            <path d="M13 3.5 Q16 1 19 3.5" stroke="#4dc9ff" stroke-width="0.6" opacity="0.6" fill="none" />
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title display">CX · WORKBENCH</div>
          <div class="brand-sub mono">楼宇调适分析工作台 v2.0</div>
        </div>
      </div>
    </div>

    <nav class="topbar-nav">
      <a
        v-for="m in MODULES"
        :key="m.key"
        class="nav-item"
        :class="{ active: isActive(m.key) }"
        :title="m.active ? '' : '该模块将在后续批次开发'"
        @click="onNav(m)"
      >
        <Icon :name="m.icon" :size="15" />
        <span>{{ m.label }}</span>
        <span v-if="!m.active" class="nav-badge mono">WIP</span>
      </a>
    </nav>

    <div class="topbar-right">
      <div class="status-pill">
        <span class="dot" /> 规则引擎在线
      </div>
      <button class="icon-btn"><Icon name="bell" /></button>
      <button class="icon-btn"><Icon name="settings" /></button>
      <div class="user-chip">
        <div class="avatar">FX</div>
        <span>分析员 / 规则调试</span>
      </div>
    </div>
  </div>
</template>
