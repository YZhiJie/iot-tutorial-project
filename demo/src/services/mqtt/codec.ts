/**
 * 解码/容错层：把不可信的字节流变成可信的领域对象
 *
 * 网络对端是不可信的：JSON 可能烂、字段可能缺、时间戳可能漂、报文可能重复。
 * 本层统一负责：解析 → 校验 → 归一化 → 去重 → 统计打点，
 * 保证上层（store/UI）永远拿到"干净"数据。
 * 生产教训：绝不要让 UI 层散落这些容错逻辑 —— 一处收敛，处处受益（docs 4.4）。
 */
import { reactive } from 'vue'

import type { CommandReply, DeviceEvent, TelemetryPoint } from '@/types/iot'

/** Result 风格返回值：调用方无需 try/catch */
export type DecodeResult<T> = { ok: true; value: T } | { ok: false; reason: string }

/** 解码统计（模块级单例，UI 直接引用展示：ConnectionIndicator 底部） */
export const codecStats = reactive({
  received: 0, // 收到上行报文总数
  decoded: 0, // 成功解码
  dropped: 0, // 丢弃总数
  duplicates: 0, // 其中：重复报文
  corrected: 0, // 其中：时钟漂移被钳制的报文
})

/** 时间戳漂移容忍：偏差超过 5 分钟视为设备时钟异常，钳制为本地接收时间 */
const MAX_TS_DRIFT_MS = 5 * 60 * 1000
/** 去重窗口：保留最近 500 个报文 id（环形淘汰） */
const DEDUPE_CAP = 500

const seenMids = new Set<string>()
const midQueue: string[] = []

/** 首次出现返回 true；已见过返回 false（即重复报文） */
function markSeen(id: string): boolean {
  if (seenMids.has(id)) return false
  if (midQueue.length >= DEDUPE_CAP) {
    const oldest = midQueue.shift()
    if (oldest !== undefined) seenMids.delete(oldest)
  }
  midQueue.push(id)
  seenMids.add(id)
  return true
}

function text(payload: unknown): string {
  if (typeof payload === 'string') return payload
  return new TextDecoder().decode(payload as Uint8Array)
}

function parseJson(raw: string): DecodeResult<Record<string, unknown>> {
  try {
    const v: unknown = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      return { ok: false, reason: '载荷不是 JSON 对象' }
    }
    return { ok: true, value: v as Record<string, unknown> }
  } catch {
    return { ok: false, reason: 'JSON 解析失败' }
  }
}

/** 数值字段清洗：字符串数字兜底转换，其余非有限数一律剔除，绝不让 NaN 流入 UI */
function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return undefined
}

/** 时间戳纠偏：缺失或漂移过大 → 用本地接收时间顶替并打标 */
function fixTs(raw: unknown, recvTs: number): { ts: number; corrected: boolean } {
  const ts = num(raw)
  if (ts === undefined) return { ts: recvTs, corrected: true }
  if (Math.abs(ts - recvTs) > MAX_TS_DRIFT_MS) return { ts: recvTs, corrected: true }
  return { ts, corrected: false }
}

const METRIC_KEYS = ['temp', 'humi', 'battery', 'rssi', 'power', 'voltage'] as const

/** 单样本归一化：无任何有效字段返回 null（视为坏样本） */
function normalizeSample(raw: Record<string, unknown>, recvTs: number): TelemetryPoint | null {
  const { ts, corrected } = fixTs(raw.t ?? raw.ts, recvTs)
  const point: TelemetryPoint = { ts, corrected }
  let valid = false
  for (const k of METRIC_KEYS) {
    const v = num(raw[k])
    if (v !== undefined) {
      point[k] = v
      valid = true
    }
  }
  if (typeof raw.on === 'boolean') {
    point.on = raw.on
    valid = true
  }
  if (corrected) codecStats.corrected++
  return valid ? point : null
}

/**
 * 解码遥测报文：同时支持单包与低功耗批量信封
 *   单包：{ mid, ts, temp, humi, battery, rssi }
 *   批量：{ mid, ts, samples: [{ t, temp, humi, battery }] }（docs 2.4）
 */
export function decodeTelemetry(payload: unknown, recvTs: number): DecodeResult<TelemetryPoint[]> {
  codecStats.received++
  const parsed = parseJson(text(payload))
  if (!parsed.ok) {
    codecStats.dropped++
    return parsed
  }
  const obj = parsed.value

  // 去重：以报文 mid 为准；缺 mid 的报文无法去重，仍照常处理
  const id = typeof obj.mid === 'string' ? obj.mid : null
  if (id && !markSeen(id)) {
    codecStats.duplicates++
    codecStats.dropped++
    return { ok: false, reason: '重复报文' }
  }

  // 批量信封 → 展开为多个遥测点
  if (Array.isArray(obj.samples)) {
    const points: TelemetryPoint[] = []
    for (const s of obj.samples) {
      if (!s || typeof s !== 'object' || Array.isArray(s)) continue
      const p = normalizeSample(s as Record<string, unknown>, recvTs)
      if (p) points.push(p)
    }
    if (points.length === 0) {
      codecStats.dropped++
      return { ok: false, reason: '批量信封内无有效样本' }
    }
    codecStats.decoded++
    return { ok: true, value: points }
  }

  // 单包
  const p = normalizeSample(obj, recvTs)
  if (!p) {
    codecStats.dropped++
    return { ok: false, reason: '无有效遥测字段' }
  }
  codecStats.decoded++
  return { ok: true, value: [p] }
}

/** 设备档案（up/status）：在线状态 + 展示元信息 */
export interface DecodedStatus {
  online: boolean
  name?: string
  productId?: string
  productName?: string
  fw?: string
  ip?: string
  reason?: string
}

export function decodeStatus(payload: unknown): DecodeResult<DecodedStatus> {
  const parsed = parseJson(text(payload))
  if (!parsed.ok) return parsed
  const obj = parsed.value
  return {
    ok: true,
    value: {
      online: obj.online === true,
      name: typeof obj.name === 'string' ? obj.name : undefined,
      productId:
        typeof obj.product === 'object' && obj.product
          ? String((obj.product as Record<string, unknown>).id ?? '')
          : undefined,
      productName:
        typeof obj.product === 'object' && obj.product
          ? String((obj.product as Record<string, unknown>).name ?? '')
          : undefined,
      fw: typeof obj.fw === 'string' ? obj.fw : undefined,
      ip: typeof obj.ip === 'string' ? obj.ip : undefined,
      reason: typeof obj.reason === 'string' ? obj.reason : undefined,
    },
  }
}

/** 异常事件（up/event）：字段宽松兜底，绝不让坏事件炸掉告警中心 */
export function decodeEvent(payload: unknown, recvTs: number): DecodeResult<DeviceEvent> {
  codecStats.received++
  const parsed = parseJson(text(payload))
  if (!parsed.ok) {
    codecStats.dropped++
    return parsed
  }
  const obj = parsed.value
  const level =
    obj.level === 'warn' || obj.level === 'error' || obj.level === 'info' ? obj.level : 'info'
  codecStats.decoded++
  return {
    ok: true,
    value: {
      ts: fixTs(obj.ts, recvTs).ts,
      code: typeof obj.code === 'string' ? obj.code : 'UNKNOWN',
      level,
      message: typeof obj.message === 'string' ? obj.message : '(设备未提供描述)',
      value: num(obj.value),
    },
  }
}

/** 指令回执（down/command_reply）：必须有 id 与 ok 字段 */
export function decodeCommandReply(payload: unknown): DecodeResult<CommandReply> {
  const parsed = parseJson(text(payload))
  if (!parsed.ok) return parsed
  const obj = parsed.value
  if (typeof obj.id !== 'string' || typeof obj.ok !== 'boolean') {
    return { ok: false, reason: '回执缺少 id/ok 字段' }
  }
  return {
    ok: true,
    value: { id: obj.id, ok: obj.ok, message: typeof obj.message === 'string' ? obj.message : '' },
  }
}
