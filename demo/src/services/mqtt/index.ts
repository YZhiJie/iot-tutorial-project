/**
 * IoT 网关（门面）：连接、路由、解码、指令 RPC 的统一入口
 *
 * 分层：UI → stores → IotGateway → MqttConnection → mqtt.js
 * 网关不 import Pinia store —— 依赖通过 handlers 回调注入，
 * 保持服务层无框架依赖（可单测、可在非 Vue 环境复用）。
 *
 * 指令下发实现的是「RPC over MQTT」模式（docs 3.4）：
 *   请求 { id, action, params } → QoS 1 发布
 *   回执 { id, ok, message }   → 用 id 关联回 pending Promise
 *   超时 CONFIG.commandTimeoutMs →  resolve { status: 'timeout' }
 */
import { CONFIG } from '@/config'
import { uuid } from '@/utils/uuid'

import type {
  CommandAction,
  CommandMessage,
  CommandOutcome,
  CommandReply,
  DeviceEvent,
  TelemetryPoint,
} from '@/types/iot'
import { MqttConnection, type ConnState } from './connection'
import {
  decodeCommandReply,
  decodeEvent,
  decodeStatus,
  decodeTelemetry,
  type DecodedStatus,
} from './codec'
import { commandTopic, parseTopic } from './topics'

export interface GatewayHandlers {
  onConnectionState(state: ConnState, attempt: number, detail?: string): void
  onProfile(deviceId: string, productId: string, status: DecodedStatus): void
  onTelemetry(deviceId: string, productId: string, points: TelemetryPoint[]): void
  onEvent(deviceId: string, productId: string, event: DeviceEvent): void
  onCommandReply(reply: CommandReply): void
}

interface PendingCommand {
  resolve: (outcome: CommandOutcome) => void
  timer: ReturnType<typeof setTimeout>
}

export class IotGateway {
  private conn: MqttConnection
  private pending = new Map<string, PendingCommand>()

  constructor(private readonly handlers: GatewayHandlers) {
    this.conn = new MqttConnection({
      onState: (state, attempt, detail) => handlers.onConnectionState(state, attempt, detail),
      onMessage: (topic, payload) => this.route(topic, payload),
    })
  }

  start(): void {
    this.conn.connect()
  }

  stop(): void {
    // 未完成的指令按超时语义收口，避免调用方 Promise 悬挂
    for (const [, p] of this.pending) {
      clearTimeout(p.timer)
      p.resolve({ status: 'timeout' })
    }
    this.pending.clear()
    this.conn.end()
  }

  /** 消息路由：Topic 解析 → 按类型分发解码 → 交回 handlers */
  private route(topic: string, payload: Uint8Array): void {
    const info = parseTopic(topic)
    // 不属于本契约的主题（其它应用/心跳包等）：静默忽略
    if (!info) return
    const recvTs = Date.now()

    switch (info.kind) {
      case 'status': {
        const r = decodeStatus(payload)
        if (r.ok) this.handlers.onProfile(info.deviceId, info.productId, r.value)
        break
      }
      case 'telemetry': {
        const r = decodeTelemetry(payload, recvTs)
        if (r.ok) this.handlers.onTelemetry(info.deviceId, info.productId, r.value)
        break
      }
      case 'event': {
        const r = decodeEvent(payload, recvTs)
        if (r.ok) this.handlers.onEvent(info.deviceId, info.productId, r.value)
        break
      }
      case 'command_reply': {
        const r = decodeCommandReply(payload)
        if (r.ok) {
          this.settle(r.value)
          this.handlers.onCommandReply(r.value)
        }
        break
      }
      default:
        break // command：前端不订阅下行指令本身
    }
  }

  /**
   * 下发控制指令（RPC over MQTT）
   * 三个状态：ok（设备确认）/ rejected（设备拒绝，如参数非法）/ timeout（回执超时）
   * 注意：即使 MQTT 层发布成功，设备也可能没收到/没执行 —— 所以必须等业务回执。
   */
  publishCommand(
    deviceId: string,
    productId: string,
    action: CommandAction,
    params?: Record<string, unknown>,
  ): Promise<CommandOutcome> {
    const id = uuid()
    const msg: CommandMessage = { id, action, params, issuedAt: Date.now() }
    return new Promise<CommandOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve({ status: 'timeout' })
      }, CONFIG.commandTimeoutMs)
      this.pending.set(id, { resolve, timer })
      try {
        // QoS 1：指令必须送达（至少先到一次），遥测才用 QoS 0
        this.conn.publish(commandTopic(productId, deviceId), JSON.stringify(msg), 1)
      } catch (err) {
        clearTimeout(timer)
        this.pending.delete(id)
        resolve({ status: 'rejected', message: (err as Error).message })
      }
    })
  }

  /** 用请求 id 把回执接回对应的 Promise */
  private settle(reply: CommandReply): void {
    const p = this.pending.get(reply.id)
    if (!p) return // 超时后才姗姗来迟的回执：静默忽略（提示策略见 docs 3.4）
    clearTimeout(p.timer)
    this.pending.delete(reply.id)
    p.resolve(
      reply.ok
        ? { status: 'ok', message: reply.message }
        : { status: 'rejected', message: reply.message },
    )
  }
}
