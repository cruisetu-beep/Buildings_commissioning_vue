<script setup>
/* ═══════════════════════════════════════════════════════════════
   SaveConfirmModal · 保存确认对话框
   ═══════════════════════════════════════════════════════════════ */
import { computed } from "vue";
import Icon from "../icons/Icon.vue";
import { FUNC_MAP } from "../../data/func-map.js";
import { THRESHOLD_RULE_META, AFFECTED_COUNT } from "../../data/threshold-matrix-data.js";

const props = defineProps({
  changes: { type: Array, required: true },
});
const emit = defineEmits(["confirm", "cancel"]);

// 简化统计:直接累加(实际应去重),与原型保持一致
const totalAffected = computed(() => {
  const set = new Set();
  props.changes.forEach((c) => {
    const n = AFFECTED_COUNT[c.rule]?.[c.func] || 0;
    for (let i = 0; i < n; i++) set.add(`${c.rule}-${c.func}-${i}`);
  });
  return set.size;
});
</script>

<template>
  <div class="modal-overlay" @click="emit('cancel')">
    <div class="modal-card float-in" @click.stop>
      <div class="modal-head">
        <div class="modal-title-row">
          <Icon name="alert" :size="18" stroke="var(--warn)" />
          <div>
            <h3 class="modal-title">确认保存 {{ changes.length }} 项变更?</h3>
            <div class="modal-sub">
              以下修改<b>立即生效</b>,下次判定计算采用新值。历史判定结果<b>不受影响</b>。
            </div>
          </div>
        </div>
      </div>

      <div class="modal-body">
        <div class="changes-summary mono">
          共影响约 <b>{{ totalAffected }}</b> 栋建筑的判定
        </div>
        <div class="changes-list">
          <div v-for="(c, i) in changes" :key="i" class="change-row">
            <div class="change-row-left">
              <span class="chg-rule mono">{{ c.rule }}</span>
              <span class="chg-func">
                <span class="mono">{{ c.func }}</span>
                <span class="chg-func-name">{{ FUNC_MAP[c.func] }}</span>
              </span>
            </div>
            <div class="change-row-mid">
              <span class="chg-old mono">{{ c.oldValue }}{{ THRESHOLD_RULE_META[c.rule].suffix }}</span>
              <Icon name="chevron-r" :size="12" stroke="var(--text-3)" />
              <span class="chg-new mono">{{ c.newValue }}{{ THRESHOLD_RULE_META[c.rule].suffix }}</span>
            </div>
            <div class="change-row-right mono">
              ~{{ AFFECTED_COUNT[c.rule]?.[c.func] || 0 }} 栋
            </div>
          </div>
        </div>
      </div>

      <div class="modal-foot">
        <button class="btn ghost" @click="emit('cancel')">
          <Icon name="x" :size="13" /> 取消
        </button>
        <button class="btn primary" @click="emit('confirm')">
          <Icon name="check" :size="13" /> 确认保存并立即生效
        </button>
      </div>
    </div>
  </div>
</template>
