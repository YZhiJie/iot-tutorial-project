/**
 * Topic 契约：全局唯一的主题约定、构造与解析工具
 *
 * 约定：iot/{productId}/{deviceId}/{dir}/{kind}
 *   up/telemetry        设备 → 云   遥测数据            QoS 0（高频可容忍丢失）
 *   up/status           设备 → 云   在线状态/设备档案   QoS 1 + retain（保留消息）
 *   up/event            设备 → 云   异常事件（告警）    QoS 1
 *   down/command        云 → 设备   控制指令            QoS 1
 *   down/command_reply  设备 → 云   指令回执            QoS 1
 *
 * 为什么前端不订阅 down/command？
 *   下行指令的审计通常另设专用通道（如 iot/{projectId}/audit/command），
 *   教学项目从简：前端只关心回执，不回声自己发出的指令。
 */
import type { TopicInfo } from '@/types/iot'

const TOPIC_RE =
  /^iot\/([^/]+)\/([^/]+)\/(up|down)\/(telemetry|status|event|command|command_reply)$/

export const telemetryTopic = (p: string, d: string) => `iot/${p}/${d}/up/telemetry`
export const statusTopic = (p: string, d: string) => `iot/${p}/${d}/up/status`
export const eventTopic = (p: string, d: string) => `iot/${p}/${d}/up/event`
export const commandTopic = (p: string, d: string) => `iot/${p}/${d}/down/command`
export const commandReplyTopic = (p: string, d: string) => `iot/${p}/${d}/down/command_reply`

/**
 * 前端订阅清单：两级通配符一次拿全部上行 + 指令回执
 * `#` 匹配剩余全部层级；`+` 匹配单层（MQTT 通配符语义见 docs 3.3）
 */
export const SUBSCRIBE_TOPICS = ['iot/+/+/up/#', 'iot/+/+/down/command_reply'] as const

/** 解析 Topic 为结构化信息；不属于本契约的主题返回 null（调用方静默忽略） */
export function parseTopic(topic: string): TopicInfo | null {
  const m = TOPIC_RE.exec(topic)
  if (!m) return null
  return {
    productId: m[1] as string,
    deviceId: m[2] as string,
    dir: m[3] as 'up' | 'down',
    kind: m[4] as TopicInfo['kind'],
  }
}
