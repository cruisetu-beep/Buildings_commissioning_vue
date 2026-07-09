<script setup>
/* ═══════════════════════════════════════════════════════════════
   App · 顶层容器
   ═══════════════════════════════════════════════════════════════ */
import TopBar from "./components/layout/TopBar.vue";
</script>

<template>
  <TopBar />
  <div class="app">
    <router-view />
  </div>
</template>
