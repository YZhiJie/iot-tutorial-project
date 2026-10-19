/**
 * 全局配置：环境变量 → localStorage 覆盖 → 兜底默认值
 *
 * 生产实践中 Broker 地址由部署环境注入（CI 变量/配置服务），
 * 这里保留 localStorage 覆盖入口便于教学联调：
 *   localStorage.setItem('iot.mqttUrl', 'ws://192.168.1.100:8083/mqtt') 后刷新
 */
const LS_KEY = 'iot.mqttUrl'

function resolveMqttUrl(): string {
  const fromLS = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null
  if (fromLS) return fromLS
  return import.meta.env.VITE_MQTT_URL || 'ws://localhost:8083/mqtt'
}

export const CONFIG = {
  /** Broker WebSocket 地址 */
  mqttUrl: resolveMqttUrl(),
  /**
   * clientId 前缀：MQTT 规定同 clientId 的两个连接会互踢，
   * 每次连接追加随机后缀，避免多标签页/多窗口互相挤掉线（docs 2.1 坑点）
   */
  clientIdPrefix: 'web-console',
  /** 遥测滑动窗口上限：防止长时间运行内存无限增长（docs 4.2） */
  windowCap: 120,
  /** 温度告警阈值默认值（与模拟设备出厂值一致） */
  defaultTempThreshold: 35,
  /** 指令回执超时时间 */
  commandTimeoutMs: 8000,
  /** 超过该时长无任何上报 → 前端看门狗判定离线（docs 4.3） */
  offlineAfterMs: 45_000,
} as const
