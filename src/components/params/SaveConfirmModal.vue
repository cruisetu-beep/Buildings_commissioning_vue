<script setup>
/* ═══════════════════════════════════════════════════════════════
   SaveConfirmModal · 保存确认对话框
   ═══════════════════════════════════════════════════════════════ */
import { ref, onMounted } from "vue";
import Icon from "../icons/Icon.vue";
import { fetchFuncDict } from "../../data/buildings-api.js";

const props = defineProps({
  changes: { type: Array, required: true },
});
const emit = defineEmits(["confirm", "cancel"]);

const funcMap = ref({});

const getSuffix = (rule) => {
  if (rule === "D02" || rule === "D03" || rule === "D04") return "%";
  return "";
};

onMounted(async () => {
  try {
    funcMap.value = await fetchFuncDict();
  } catch (err) {
    console.error("Failed to load func dict in SaveConfirmModal:", err);
  }
});
</script>

<template>
  <div class="modal-overlay" @click="emit('cancel')">
    <div class="modal-card float-in modal-confirm" @click.stop>
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
        <div class="changes-list">
          <div v-for="(c, i) in changes" :key="i" class="change-row">
            <div class="change-row-left">
              <span class="chg-rule mono">{{ c.rule }}</span>
              <span class="chg-func">
                <span class="mono">{{ c.func }}</span>
                <span class="chg-func-name">{{ funcMap[c.func] }}</span>
              </span>
            </div>
            <div class="change-row-mid">
              <span class="chg-old mono">{{ c.oldValue }}{{ getSuffix(c.rule) }}</span>
              <Icon name="chevron-r" :size="12" stroke="var(--text-3)" />
              <span class="chg-new mono">{{ c.newValue }}{{ getSuffix(c.rule) }}</span>
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
