/**
 * MQTT 连接管理器（浏览器端）
 *
 * 设计决策（为什么不用 mqtt.js 内置自动重连，docs 4.3）：
 * - reconnectPeriod: 0 关闭内置重连，改由本类实现「全抖动指数退避」：
 *     delay = random(0, min(30s, 1s × 2^attempt))
 *   随机化能打散"服务端重启后海量客户端同时重连"的重连风暴；
 * - 入站看门狗：连接"假死"（TCP 未断但数据不通）时主动断开重连；
 * - clean: true + 每次（重）连接成功后显式重订阅：会话不依赖 broker 状态，
 *   行为可预期（clean 会话不保留订阅列表，重连后必须重新 subscribe）。
 */
import mqtt, { type MqttClient } from 'mqtt'

import { CONFIG } from '@/config'

import { SUBSCRIBE_TOPICS } from './topics'

export type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'

export interface ConnectionEvents {
  onState(state: ConnState, attempt: number, detail?: string): void
  onMessage(topic: string, payload: Uint8Array): void
}

const MAX_BACKOFF_MS = 30_000
const BASE_BACKOFF_MS = 1_000
/** 连接建立后持续无入站报文超过该时长 → 判定连接假死 */
const INBOUND_WATCHDOG_MS = 90_000
const WATCHDOG_TICK_MS = 5_000

export class MqttConnection {
  private client: MqttClient | null = null
  private _state: ConnState = 'idle'
  private attempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private watchdogTimer: ReturnType<typeof setInterval> | null = null
  private lastInboundAt = 0
  private ended = false

  constructor(private readonly events: ConnectionEvents) {}

  get state(): ConnState {
    return this._state
  }

  get reconnectAttempt(): number {
    return this.attempt
  }

  /** 建立连接（含首次与重连；重连参数以当前 attempt 计） */
  connect(): void {
    this.ended = false
    this.setState(this.attempt === 0 ? 'connecting' : 'reconnecting')
    const clientId = `${CONFIG.clientIdPrefix}_${Math.random().toString(36).slice(2, 10)}`
    // 关键参数解析见 docs 2.1；reconnectPeriod: 0 = 关闭内置重连，由本类接管
    this.client = mqtt.connect(CONFIG.mqttUrl, {
      clientId,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 0,
      connectTimeout: 8_000,
    })

    this.client.on('connect', () => {
      this.attempt = 0
      this.lastInboundAt = Date.now()
      this.setState('connected')
      // clean 会话不保留订阅 → 每次（重）连接成功后必须显式重订阅
      this.client?.subscribe([...SUBSCRIBE_TOPICS], { qos: 1 }, (err) => {
        if (err) console.error('[mqtt] 订阅失败', err)
      })
      this.startWatchdog()
    })

    this.client.on('message', (topic, payload) => {
      this.lastInboundAt = Date.now()
      this.events.onMessage(topic, payload)
    })

    this.client.on('error', (err) => {
      // error 之后通常紧跟 close；这里仅记录日志，重连统一在 close 中调度（避免重复）
      console.warn('[mqtt] 连接错误：', err.message)
    })

    this.client.on('close', () => {
      this.stopWatchdog()
      if (this.ended) {
        this.setState('closed')
        return
      }
      this.scheduleReconnect('连接关闭')
    })
  }

  /**
   * 全抖动指数退避：
   *   ceiling = min(MAX, BASE × 2^attempt) → delay = random(0, ceiling)
   * 与"等间隔退避 + 抖动"相比，全抖动让重连时间点在整个窗口内均匀分布，
   * 服务端重启瞬间不会收到集中冲击（AWS 架构博客推荐策略）。
   */
  private scheduleReconnect(reason: string): void {
    this.attempt++
    const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** this.attempt)
    const delay = Math.random() * ceiling
    this.setState('reconnecting', this.attempt, reason)
    this.destroyClient()
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  /** 彻底销毁旧 client：先摘掉监听器再强制关闭，防止 close 事件重复触发调度 */
  private destroyClient(): void {
    if (!this.client) return
    this.client.removeAllListeners()
    this.client.end(true) // true = 立即强制关闭，不等待在途报文
    this.client = null
  }

  publish(topic: string, payload: string, qos: 0 | 1 = 1): void {
    if (!this.client || !this.client.connected) {
      throw new Error('MQTT 未连接，无法发布')
    }
    this.client.publish(topic, payload, { qos })
  }

  /** 应用卸载/页面离开时调用：不再触发任何重连 */
  end(): void {
    this.ended = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.stopWatchdog()
    this.destroyClient()
    this.setState('closed')
  }

  /** 入站看门狗：已连接但长时间收不到任何报文 → 判定假死并强制重连 */
  private startWatchdog(): void {
    this.stopWatchdog()
    this.watchdogTimer = setInterval(() => {
      if (this._state !== 'connected') return
      if (Date.now() - this.lastInboundAt < INBOUND_WATCHDOG_MS) return
      this.stopWatchdog()
      this.scheduleReconnect('入站看门狗超时（连接假死）')
    }, WATCHDOG_TICK_MS)
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer)
    this.watchdogTimer = null
  }

  private setState(s: ConnState, attempt = this.attempt, detail?: string): void {
    this._state = s
    this.events.onState(s, attempt, detail)
  }
}
