<script setup>
/* ═══════════════════════════════════════════════════════════════
   ResetDefaultModal · 恢复默认值确认对话框
   ═══════════════════════════════════════════════════════════════ */
import Icon from "../icons/Icon.vue";

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div class="modal-overlay" @click="emit('cancel')">
    <div class="modal-card float-in modal-sm" @click.stop>
      <div class="modal-head">
        <div class="modal-title-row">
          <Icon name="alert" :size="18" stroke="var(--danger)" />
          <div>
            <h3 class="modal-title">恢复所有阈值到出厂默认值?</h3>
            <div class="modal-sub">
              将丢弃所有历史修改,恢复到规则手册 v2.0 定义的初始阈值。此操作不可撤销。
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn ghost" @click="emit('cancel')">取消</button>
        <button class="btn danger" @click="emit('confirm')">
          <Icon name="x" :size="13" /> 确认恢复默认
        </button>
      </div>
    </div>
  </div>
</template>
