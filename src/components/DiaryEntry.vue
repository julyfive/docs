<template>
  <div class="diary-entry">
    <div class="diary-date">
      📅 {{ displayDate }}
      <span v-if="!date" class="diary-date-warn"> （未固化时间，刷新会变，请传入 date 属性） </span>
    </div>
    <div class="diary-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  date: {
    type: String,
    default: ''
  }
});
const displayDate = computed(() => {
  if (props.date) return props.date;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
});
</script>

<style scoped>
.diary-entry {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px 20px;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
}

.diary-date {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-brand);
  margin-bottom: 8px;
}

.diary-date-warn {
  color: var(--vp-c-warning);
  font-weight: 400;
  font-size: 12px;
}

.diary-content {
  line-height: 1.8;
}
</style>
