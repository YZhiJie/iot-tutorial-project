/**
 * 设备注册表 store：档案、在线状态、遥测滑窗、阈值、离线看门狗
 *
 * 数据结构决策：
 * - Record<deviceId, DeviceEntry>：O(1) 按 id 定位（消息流按 id 高频写入）；
 *   列表展示用 getter 派生，避免维护两份结构；
 * - window 上限 CONFIG.windowCap：滑动窗口「淘汰最旧」，防长会话内存增长（docs 4.2）；
 * - 在线判定三重保障：设备自报（status）/ 遗嘱消息 / 前端看门狗（lastSeen 超时推导），
 *   看门狗兜底一切"静默故障"（设备半死不活但连接还在）。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { CONFIG } from '@/config'
import type { DecodedStatus } from '@/services/mqtt/codec'
import type { DeviceProfile, TelemetryPoint } from '@/types/iot'

import { useAlertsStore } from './alerts'

export interface DeviceEntry {
  profile: DeviceProfile | null
  online: boolean
  /** 最近一次"收到消息"的本地时间（用接收时刻而非设备 ts，天然免疫时钟漂移） */
  lastSeenAt: number
  latest?: TelemetryPoint
  /** 遥测滑动窗口（时间升序），上限 windowCap */
  window: TelemetryPoint[]
  /** 温度告警阈值（setThreshold 指令可修改） */
  tempThreshold: number
  /** 智能插座开关状态 */
  on?: boolean
  /** 离线告警去重：同一次离线只报一次 */
  offlineAlerted: boolean
}

export const useDevicesStore = defineStore('devices', () => {
  const map = ref<Record<string, DeviceEntry>>({})

  function ensure(deviceId: string): DeviceEntry {
    let e = map.value[deviceId]
    if (!e) {
      e = {
        profile: null,
        online: false,
        lastSeenAt: 0,
        window: [],
        tempThreshold: CONFIG.defaultTempThreshold,
        offlineAlerted: false,
      }
      map.value[deviceId] = e
    }
    return e
  }

  /** 设备档案（up/status 保留消息）：首次订阅即可获得全部设备清单 */
  function ingestProfile(deviceId: string, productId: string, s: DecodedStatus): void {
    const e = ensure(deviceId)
    e.profile = {
      productId,
      productName: s.productName || productId,
      deviceId,
      name: s.name || deviceId,
      fw: s.fw,
      ip: s.ip,
    }
    setOnline(e, s.online, s.reason)
  }

  /** 在线状态切换：online→offline 转换时推送一条本地推导告警（去重） */
  function setOnline(e: DeviceEntry, online: boolean, reason?: string): void {
    const was = e.online
    e.online = online
    if (online) {
      e.offlineAlerted = false
      e.lastSeenAt = Date.now()
      return
    }
    if (was && !e.offlineAlerted) {
      e.offlineAlerted = true
      useAlertsStore().push({
        deviceId: e.profile?.deviceId ?? '?',
        deviceName: e.profile?.name ?? e.profile?.deviceId ?? '?',
        level: 'warn',
        code: 'DEVICE_OFFLINE',
        message: `设备离线${reason ? `（${reason}）` : ''}`,
        fromDevice: false,
      })
    }
  }

  /**
   * 遥测入库：追加窗口、更新 latest/lastSeen/开关状态
   * 注：即使设备从未发过 status，只要遥测到达即视为在线（status 报文丢失的兜底）
   */
  function ingestTelemetry(deviceId: string, _productId: string, points: TelemetryPoint[]): void {
    if (points.length === 0) return
    const e = ensure(deviceId)
    if (!e.online) {
      e.online = true
      e.offlineAlerted = false
    }
    // lastSeen 用本地接收时刻：设备时钟可能漂移，不能信它的时间戳
    e.lastSeenAt = Date.now()

    for (const p of points) e.window.push(p)
    const last = points[points.length - 1]
    if (last) e.latest = last
    const onPoint = points.find((p) => typeof p.on === 'boolean')
    if (onPoint && onPoint.on !== undefined) e.on = onPoint.on

    // 滑窗裁剪：一次性删除超出上限的最旧数据（splice 比循环 shift 高效）
    if (e.window.length > CONFIG.windowCap) {
      e.window.splice(0, e.window.length - CONFIG.windowCap)
    }
  }

  function setThreshold(deviceId: string, v: number): void {
    ensure(deviceId).tempThreshold = v
  }

  function nameOf(deviceId: string, fallback: string): string {
    return map.value[deviceId]?.profile?.name ?? fallback
  }

  // —— 离线看门狗：兜底 status 报文丢失/遗嘱未触发等静默故障 ——
  let watchdogTimer: ReturnType<typeof setInterval> | null = null

  function startWatchdog(): void {
    if (watchdogTimer) return
    watchdogTimer = setInterval(() => {
      const now = Date.now()
      for (const e of Object.values(map.value)) {
        if (e.online && e.lastSeenAt > 0 && now - e.lastSeenAt > CONFIG.offlineAfterMs) {
          setOnline(e, false, '上报超时，前端看门狗判定')
        }
      }
    }, 5000)
  }

  function stopWatchdog(): void {
    if (watchdogTimer) clearInterval(watchdogTimer)
    watchdogTimer = null
  }

  const list = computed(() => Object.values(map.value))
  const onlineCount = computed(() => list.value.filter((e) => e.online).length)
  const offlineCount = computed(() => list.value.length - onlineCount.value)

  return {
    map,
    ensure,
    ingestProfile,
    ingestTelemetry,
    setOnline,
    setThreshold,
    nameOf,
    startWatchdog,
    stopWatchdog,
    list,
    onlineCount,
    offlineCount,
  }
})
