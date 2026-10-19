<script setup lang="ts">
/**
 * 连接指示器：MQTT 连接状态机 + 解码统计
 * 状态来源：stores/connection（由网关回调驱动，不直接碰 mqtt.js）
 */
import { computed } from 'vue'

import { codecStats } from '@/services/mqtt/codec'
import { useConnectionStore } from '@/stores/connection'

const conn = useConnectionStore()

const label = computed(() => {
  switch (conn.state) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中…'
    case 'reconnecting':
      return `重连中（第 ${conn.attempt} 次）`
    case 'closed':
      return '已断开'
    default:
      return '未启动'
  }
})

const cls = computed(() => ({
  'is-connected': conn.state === 'connected',
  'is-busy': conn.state === 'connecting' || conn.state === 'reconnecting',
  'is-dead': conn.state === 'closed',
}))
</script>

<template>
  <div class="conn" :title="conn.detail || conn.state">
    <div class="conn-row">
      <span class="conn-dot" :class="cls" />
      <span class="conn-label">{{ label }}</span>
    </div>
    <div class="conn-sub">解析 {{ codecStats.decoded }} · 丢弃 {{ codecStats.dropped }}</div>
  </div>
</template>

<style scoped>
.conn {
  font-size: 12px;
  color: var(--text-dim);
}
.conn-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.conn-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
}
.conn-dot.is-connected {
  background: var(--ok);
  box-shadow: 0 0 8px var(--ok);
}
.conn-dot.is-busy {
  background: var(--warn);
  animation: blink 1s infinite;
}
.conn-dot.is-dead {
  background: var(--err);
}
.conn-sub {
  margin-top: 4px;
  opacity: 0.75;
}
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
</style>
