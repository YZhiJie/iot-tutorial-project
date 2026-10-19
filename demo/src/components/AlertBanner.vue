<script setup lang="ts">
/**
 * 全局告警横幅：最新一条未确认的 error 悬浮展示
 * 处置动作：跳详情 / 就地确认（acked）
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAlertsStore } from '@/stores/alerts'

const alerts = useAlertsStore()
const router = useRouter()
const latest = computed(() => alerts.latestUnackedError)

function goDetail(): void {
  if (!latest.value) return
  router.push(`/devices/${latest.value.deviceId}`)
  alerts.ack(latest.value.id)
}
</script>

<template>
  <transition name="banner">
    <div v-if="latest" class="alert-banner">
      <span class="banner-dot" />
      <div class="banner-body">
        <div class="banner-title">{{ latest.deviceName }} · {{ latest.code }}</div>
        <div class="banner-msg">{{ latest.message }}</div>
      </div>
      <button class="btn btn-ghost btn-sm" @click="goDetail">查看</button>
      <button class="btn btn-ghost btn-sm" @click="alerts.ack(latest.id)">知道了</button>
    </div>
  </transition>
</template>

<style scoped>
.alert-banner {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 380px;
  padding: 14px 16px;
  background: var(--panel);
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
}
.banner-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--err);
  box-shadow: 0 0 8px var(--err);
  animation: pulse 1.2s infinite;
}
.banner-body {
  flex: 1;
  min-width: 0;
}
.banner-title {
  font-size: 13px;
  font-weight: 600;
}
.banner-msg {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.banner-enter-active,
.banner-leave-active {
  transition: all 0.25s ease;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}
</style>
