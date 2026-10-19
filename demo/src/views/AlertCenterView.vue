<script setup lang="ts">
/**
 * 告警中心：级别筛选 + 处置（ack / 全部确认）+ 来源标注
 * 数据源：stores/alerts（设备事件 + 前端本地推导三路汇流）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useAlertsStore } from '@/stores/alerts'
import { timeAgo } from '@/utils/format'
import type { EventLevel } from '@/types/iot'

const alerts = useAlertsStore()

const levelFilter = ref<'all' | EventLevel>('all')
const filtered = computed(() =>
  levelFilter.value === 'all'
    ? alerts.list
    : alerts.list.filter((a) => a.level === levelFilter.value),
)

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <h1 class="page-title">告警中心</h1>
    <p class="page-sub">未读 {{ alerts.unreadCount }} 条 · 同设备同类型 60s 冷却去重</p>

    <div class="toolbar">
      <select v-model="levelFilter" class="input select">
        <option value="all">全部级别</option>
        <option value="error">仅 error</option>
        <option value="warn">仅 warn</option>
        <option value="info">仅 info</option>
      </select>
      <button class="btn" :disabled="alerts.unreadCount === 0" @click="alerts.ackAll()">
        全部确认
      </button>
    </div>

    <div v-if="filtered.length" class="alert-list">
      <div v-for="a in filtered" :key="a.id" class="alert-row" :class="{ 'is-acked': a.acked }">
        <span class="level-tag" :class="`level-${a.level}`">{{ a.level }}</span>
        <div class="alert-body">
          <div class="alert-title">
            {{ a.deviceName }}
            <span class="alert-code">{{ a.code }}</span>
            <span class="alert-src">{{ a.fromDevice ? '设备上报' : '前端推导' }}</span>
          </div>
          <div class="alert-msg">{{ a.message }}</div>
        </div>
        <span class="alert-time">{{ timeAgo(a.ts, now) }}</span>
        <button class="btn btn-ghost btn-sm" :disabled="a.acked" @click="alerts.ack(a.id)">
          {{ a.acked ? '已确认' : '确认' }}
        </button>
      </div>
    </div>
    <div v-else class="empty-state">暂无告警（模拟器会随时间注入温度尖峰 / 低电量事件）</div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.alert-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.alert-row.is-acked {
  opacity: 0.45;
}
.alert-body {
  flex: 1;
  min-width: 0;
}
.alert-title {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.alert-code {
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 400;
}
.alert-src {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-dim);
  font-weight: 400;
}
.alert-msg {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-dim);
}
.alert-time {
  flex: none;
  font-size: 12px;
  color: var(--text-dim);
}
.level-tag {
  flex: none;
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  text-transform: uppercase;
}
.level-info {
  background: rgba(56, 189, 248, 0.15);
  color: var(--accent);
}
.level-warn {
  background: rgba(251, 191, 36, 0.15);
  color: var(--warn);
}
.level-error {
  background: rgba(248, 113, 113, 0.18);
  color: var(--err);
}
</style>
