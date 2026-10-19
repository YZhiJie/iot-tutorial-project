/**
 * 告警中心 store：三路告警汇流 → 冷却去重 → 容量上限 → ack
 *
 * 来源：
 *   A. 设备事件（up/event → gateway.onEvent → pushEvent）
 *   B. 前端本地推导（离线看门狗，见 stores/devices.ts）
 *   C. 平台规则引擎推送（本 demo 未启用，push 接口保持兼容）
 *
 * 去重策略（防告警风暴，docs 3.5）：同设备同 code 在冷却窗口内只收第一条；
 * 容量上限：只保留最近 200 条，避免长会话内存增长。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { AlertItem, DeviceEvent, EventLevel } from '@/types/iot'

const CAP = 200
const DEDUPE_WINDOW_MS = 60_000

interface PushInput {
  deviceId: string
  deviceName: string
  level: EventLevel
  code: string
  message: string
  fromDevice: boolean
  ts?: number
}

export const useAlertsStore = defineStore('alerts', () => {
  const list = ref<AlertItem[]>([])
  const lastByKey = new Map<string, number>()
  let seq = 0

  function push(input: PushInput): void {
    const key = `${input.deviceId}:${input.code}`
    const now = Date.now()
    const last = lastByKey.get(key)
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return
    lastByKey.set(key, now)

    const item: AlertItem = {
      id: `a_${++seq}_${now.toString(36)}`,
      ts: input.ts ?? now,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      level: input.level,
      code: input.code,
      message: input.message,
      fromDevice: input.fromDevice,
      acked: false,
    }
    list.value.unshift(item) // 新告警置顶
    if (list.value.length > CAP) list.value.pop()
  }

  /** 设备事件转告警：附上当前值便于处置 */
  function pushEvent(deviceId: string, deviceName: string, ev: DeviceEvent): void {
    push({
      deviceId,
      deviceName,
      level: ev.level,
      code: ev.code,
      message: ev.value !== undefined ? `${ev.message}（当前值 ${ev.value}）` : ev.message,
      fromDevice: true,
      ts: ev.ts,
    })
  }

  function ack(id: string): void {
    const item = list.value.find((i) => i.id === id)
    if (item) item.acked = true
  }

  function ackAll(): void {
    list.value.forEach((i) => (i.acked = true))
  }

  const unreadCount = computed(() => list.value.filter((i) => !i.acked).length)
  /** 全局横幅：最新一条未确认的 error */
  const latestUnackedError = computed(() => list.value.find((i) => !i.acked && i.level === 'error'))

  return { list, push, pushEvent, ack, ackAll, unreadCount, latestUnackedError }
})
