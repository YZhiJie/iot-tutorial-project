/**
 * 连接状态 store：让 UI（侧边栏指示器、控制面板）能感知连接层
 * 状态机：idle → connecting → connected ⇄ reconnecting → closed
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { ConnState } from '@/services/mqtt/connection'

export const useConnectionStore = defineStore('connection', () => {
  const state = ref<ConnState>('idle')
  const attempt = ref(0)
  const detail = ref('')

  function set(s: ConnState, a: number, d?: string): void {
    state.value = s
    attempt.value = a
    detail.value = d ?? ''
  }

  const isConnected = computed(() => state.value === 'connected')

  return { state, attempt, detail, set, isConnected }
})
