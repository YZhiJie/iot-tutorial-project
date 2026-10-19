<script setup lang="ts">
/** 状态徽标：在线/离线（绿点/灰点） */
defineProps<{ online: boolean }>()
</script>

<template>
  <span class="status" :class="online ? 'is-online' : 'is-offline'">
    <span class="status-dot" />
    {{ online ? '在线' : '离线' }}
  </span>
</template>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.is-online .status-dot {
  background: var(--ok);
  box-shadow: 0 0 6px var(--ok);
}
.is-offline .status-dot {
  background: #64748b;
}
</style>
