/**
 * 物联网消息契约与领域类型定义（等价于一份"接口契约文档"）
 *
 * 设计决策：
 * - 所有端云消息形态集中在此定义，前后端共用同一套词汇；
 * - TelemetryPoint 字段全部可选：不同产品上报字段不同（传感器/插座），
 *   用可选字段收敛到同一结构，避免为每种产品写一套消息类型；
 * - corrected 由解码层（codec）打标：设备时间戳漂移被钳制时为 true。
 */

/** 设备档案：来自 up/status 保留消息（设备上线时注册） */
export interface DeviceProfile {
  productId: string
  productName: string
  deviceId: string
  name: string
  fw?: string
  ip?: string
}

/** 一条归一化后的遥测点（字段有效性由 codec 保证：不会出现 NaN） */
export interface TelemetryPoint {
  /** 毫秒时间戳（可能被钳制为服务器接收时间，见 corrected） */
  ts: number
  temp?: number
  humi?: number
  battery?: number
  rssi?: number
  power?: number
  voltage?: number
  /** 智能插座开关状态 */
  on?: boolean
  /** 设备时钟漂移过大，时间戳被钳制 */
  corrected?: boolean
}

/** 设备主动上报的异常事件（up/event） */
export type EventLevel = 'info' | 'warn' | 'error'
export interface DeviceEvent {
  ts: number
  code: string
  level: EventLevel
  message: string
  value?: number
}

/** 控制指令（down/command） */
export type CommandAction = 'switch' | 'setThreshold' | 'reboot'
export interface CommandMessage {
  id: string
  action: CommandAction
  params?: Record<string, unknown>
  issuedAt: number
}

/** 指令回执（down/command_reply） */
export interface CommandReply {
  id: string
  ok: boolean
  message: string
}

/** 指令下发结果（前端视角：成功 / 拒绝 / 超时 三态） */
export type CommandOutcome =
  | { status: 'ok'; message: string }
  | { status: 'rejected'; message: string }
  | { status: 'timeout' }

/** Topic 解析结果（由 topics.ts 的 parseTopic 产出） */
export interface TopicInfo {
  productId: string
  deviceId: string
  dir: 'up' | 'down'
  kind: 'telemetry' | 'status' | 'event' | 'command' | 'command_reply'
}

/** 告警中心的一行记录（三路来源，见 stores/alerts.ts） */
export interface AlertItem {
  id: string
  ts: number
  deviceId: string
  deviceName: string
  level: EventLevel
  code: string
  message: string
  /** true=设备上报事件；false=前端本地推导（如离线看门狗） */
  fromDevice: boolean
  acked: boolean
}
