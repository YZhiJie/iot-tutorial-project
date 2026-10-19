/**
 * 文件: server/simulator.mjs
 * 设备模拟器：8 台设备接入本地 Broker，为前端制造接近真实世界的数据流
 *
 * 设备清单与"故障剧本"：
 *   gh01-001 normal     正常温湿度传感器（4~8s 随机上报）
 *   gh01-002 lowpower   低功耗设备：深睡 15s，缓存 4 个样本一次性批量上报
 *   gh01-003 spiky      温度偶发尖峰（超阈值触发 TEMP_HIGH 告警事件）
 *   gh01-005 battery    电池持续衰减（< 20% 触发一次 BATTERY_LOW）
 *   gh01-004 offline    长期离线（仅保留消息 status=offline）
 *   gh01-006 dropLater  启动 40s 后优雅下线（状态 + 事件双通道）
 *   pl01-001/002        智能插座（开关状态 → 功率遥测；接受 switch 指令）
 *
 * 刻意制造的两类"脏数据"，锻炼前端容错（docs 2.4 / 4.4）：
 *   - 约 6% 概率重复发布上一条遥测（mid 相同，前端应去重）
 *   - 低功耗批量样本带 90s 设备时钟偏移（前端应容忍轻微漂移）
 *
 * 单独启动：pnpm devices（推荐直接 pnpm server 一起拉起）
 */
import { pathToFileURL } from 'node:url'

import mqtt from 'mqtt'

const BROKER_URL = process.env.BROKER_URL ?? 'mqtt://localhost:1883'
const PRODUCT_NAMES = { gh01: '温湿度传感器', pl01: '智能插座' }

const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const round1 = (v) => Math.round(v * 10) / 10
const mid = () => crypto.randomUUID()

const DEVICES = [
  { id: 'gh01-001', mode: 'normal', name: '育苗棚 A1 · 温湿度' },
  { id: 'gh01-002', mode: 'lowpower', name: '育苗棚 A2 · 温湿度（低功耗）' },
  { id: 'gh01-003', mode: 'spiky', name: '育苗棚 B1 · 温湿度' },
  { id: 'gh01-004', mode: 'offline', name: '育苗棚 C1 · 温湿度' },
  { id: 'gh01-005', mode: 'battery', name: '育苗棚 B2 · 温湿度' },
  { id: 'gh01-006', mode: 'dropLater', name: '育苗棚 C2 · 温湿度' },
  { id: 'pl01-001', mode: 'plug', name: '泵房 · 智能插座 1', on: true },
  { id: 'pl01-002', mode: 'plug', name: '泵房 · 智能插座 2', on: false },
]

/** 发布 JSON 报文的统一出口（自动序列化 + qos/retain 选项） */
function publish(client, topic, obj, { qos = 0, retain = false } = {}) {
  client.publish(topic, JSON.stringify(obj), { qos, retain })
}

/** 传感器数值随机游走：温度 18~34℃、湿度 30~90%RH */
function stepSensor(state) {
  state.temp = clamp(state.temp + rand(-0.6, 0.6), 18, 34)
  state.humi = clamp(state.humi + rand(-1.5, 1.5), 30, 90)
  state.rssi = clamp(state.rssi + rand(-2, 2), -85, -40)
}

/** 以随机间隔循环执行 fn，返回停止函数（设备下线时清理定时器） */
function jitterLoop(minMs, maxMs, fn) {
  let timer
  const tick = () => {
    fn()
    timer = setTimeout(tick, rand(minMs, maxMs))
  }
  timer = setTimeout(tick, rand(minMs, maxMs))
  return () => clearTimeout(timer)
}

function startDevice(def) {
  const productId = def.id.split('-')[0]
  const ip = `192.168.1.${20 + DEVICES.indexOf(def)}`
  const base = `iot/${productId}/${def.id}`

  const state = {
    def,
    productId,
    base,
    ip,
    temp: rand(24, 28),
    humi: rand(50, 60),
    battery: def.mode === 'battery' ? 78 : rand(70, 100),
    rssi: -rand(45, 75),
    threshold: 35,
    on: def.on,
    lowWarned: false,
    lastTelemetry: null,
    stops: [],
  }

  // 遗嘱（LWT）：连接异常断开时由 Broker 代发 retained 离线状态
  // —— 前端即使错过"在线"报文，也能在订阅瞬间拿到最新状态（保留消息语义）
  const client = mqtt.connect(BROKER_URL, {
    clientId: `dev-${def.id}`,
    clean: true,
    keepalive: 30,
    reconnectPeriod: 3000,
    will: {
      topic: `${base}/up/status`,
      payload: JSON.stringify({ online: false, reason: 'connection_lost' }),
      qos: 1,
      retain: true,
    },
  })

  client.on('connect', () => {
    // 上线即注册"设备档案"（保留消息）：前端订阅后立刻收到，无需等下一次上报
    publish(
      client,
      `${base}/up/status`,
      {
        online: true,
        name: def.name,
        product: { id: productId, name: PRODUCT_NAMES[productId] },
        fw: 'v1.4.2',
        ip,
      },
      { qos: 1, retain: true },
    )

    if (def.mode === 'offline') {
      publish(
        client,
        `${base}/up/status`,
        { online: false, reason: 'maintenance' },
        { qos: 1, retain: true },
      )
      client.end()
      console.log(`[device] ${def.id} 注册为长期离线（retained status=offline）`)
      return
    }

    client.subscribe(`${base}/down/command`, { qos: 1 })
    client.on('message', (_topic, payload) => {
      try {
        handleCommand(client, state, JSON.parse(payload.toString()))
      } catch (err) {
        console.warn(`[device] ${def.id} 指令解析失败: ${err.message}`)
      }
    })

    if (def.mode === 'plug') startPlugLoop(client, state)
    else startSensorLoop(client, state)

    if (def.mode === 'dropLater') scheduleGracefulDrop(client, state)
    console.log(`[device] ${def.id} 上线（${def.mode}）`)
  })

  client.on('error', (err) => console.warn(`[device] ${def.id} 连接异常: ${err.message}`))
  return client
}

/** 传感器上报循环（单包 + 低功耗批量两种模式） */
function startSensorLoop(client, state) {
  const stop =
    state.def.mode === 'lowpower'
      ? startLowPowerLoop(client, state)
      : jitterLoop(4000, 8000, () =>
          reportSensor(client, state, { allowSpike: state.def.mode === 'spiky' }),
        )
  state.stops.push(stop)
}

function reportSensor(client, state, { allowSpike = false } = {}) {
  stepSensor(state)
  const payload = {
    mid: mid(),
    ts: Date.now(),
    temp: round1(state.temp),
    humi: round1(state.humi),
    battery: Math.round(state.battery),
    rssi: Math.round(state.rssi),
  }

  // 尖峰剧本：温度冲过阈值 → 同步发布 TEMP_HIGH 告警事件（error 级）
  if (allowSpike && Math.random() < 0.25) {
    payload.temp = round1(rand(36, 39.5))
    publish(
      client,
      `${state.base}/up/event`,
      {
        mid: mid(),
        ts: Date.now(),
        code: 'TEMP_HIGH',
        level: 'error',
        message: `温度 ${payload.temp}℃ 超过阈值 ${state.threshold}℃`,
        value: payload.temp,
      },
      { qos: 1 },
    )
  }

  // 电池剧本：持续衰减，跌破 20% 触发一次 BATTERY_LOW（warn 级）
  if (state.def.mode === 'battery') {
    state.battery -= 0.6
    payload.battery = Math.round(state.battery)
    if (state.battery < 20 && !state.lowWarned) {
      state.lowWarned = true
      publish(
        client,
        `${state.base}/up/event`,
        {
          mid: mid(),
          ts: Date.now(),
          code: 'BATTERY_LOW',
          level: 'warn',
          message: `电池电量 ${Math.round(state.battery)}%，低于 20%`,
          value: Math.round(state.battery),
        },
        { qos: 1 },
      )
    }
  }

  state.lastTelemetry = payload
  publish(client, `${state.base}/up/telemetry`, payload)

  // 脏数据剧本：约 6% 概率原样重发上一条（mid 相同）—— 前端应去重
  if (state.lastTelemetry && Math.random() < 0.06) {
    publish(client, `${state.base}/up/telemetry`, state.lastTelemetry)
  }
}

/** 低功耗剧本：15s 深睡，醒后把缓存 4 个样本一次性上报（带轻微时钟偏移） */
function startLowPowerLoop(client, state) {
  return jitterLoop(15000, 15000, () => {
    const samples = []
    for (let i = 3; i >= 0; i--) {
      stepSensor(state)
      samples.push({
        // +90s 模拟设备时钟偏移（在容忍范围内，前端应保留原值）
        t: Date.now() + 90_000 - i * 30_000,
        temp: round1(state.temp),
        humi: round1(state.humi),
        battery: Math.round(state.battery),
      })
    }
    const payload = { mid: mid(), ts: Date.now(), samples }
    state.lastTelemetry = payload
    publish(client, `${state.base}/up/telemetry`, payload)
    console.log(`[device] ${state.def.id} 批量上报 ${samples.length} 个缓存样本`)
  })
}

/** 智能插座上报循环：功率跟随开关状态变化 */
function startPlugLoop(client, state) {
  const stop = jitterLoop(3000, 6000, () => {
    const payload = {
      mid: mid(),
      ts: Date.now(),
      power: state.on ? Math.round(rand(1150, 1350)) : 0,
      voltage: Math.round(rand(218, 224)),
      on: state.on,
    }
    state.lastTelemetry = payload
    publish(client, `${state.base}/up/telemetry`, payload)
    if (Math.random() < 0.06 && state.lastTelemetry) {
      publish(client, `${state.base}/up/telemetry`, state.lastTelemetry)
    }
  })
  state.stops.push(stop)
}

/** 计划内下线剧本：状态（retained）+ 事件双通道通知，随后停止上报 */
function scheduleGracefulDrop(client, state) {
  const timer = setTimeout(() => {
    publish(
      client,
      `${state.base}/up/status`,
      { online: false, reason: 'graceful_shutdown' },
      { qos: 1, retain: true },
    )
    publish(
      client,
      `${state.base}/up/event`,
      {
        mid: mid(),
        ts: Date.now(),
        code: 'DEVICE_OFFLINE',
        level: 'info',
        message: '设备计划内停机',
      },
      { qos: 1 },
    )
    state.stops.forEach((fn) => fn())
    state.stops = []
    console.log(`[device] ${state.def.id} 已优雅下线（观察前端离线推导与告警）`)
  }, 40_000)
  state.stops.push(() => clearTimeout(timer))
}

/**
 * 指令处理：switch / setThreshold / reboot
 * 回执统一走 down/command_reply，带请求 id（前端用 id 关联 Promise）
 */
function handleCommand(client, state, msg) {
  const { id, action, params } = msg ?? {}
  if (typeof id !== 'string') return
  const reply = (ok, message) =>
    publish(client, `${state.base}/down/command_reply`, { id, ok, message }, { qos: 1 })
  console.log(`[device] ${state.def.id} 收到指令 ${action} (id=${id.slice(0, 8)})`)

  switch (action) {
    case 'switch': {
      state.on = Boolean(params?.on)
      setTimeout(() => reply(true, `开关已${state.on ? '打开' : '关闭'}`), 300)
      break
    }
    case 'setThreshold': {
      const v = Number(params?.tempMax)
      if (!Number.isFinite(v) || v < 20 || v > 60) {
        reply(false, '阈值超出允许范围 [20, 60]')
        break
      }
      state.threshold = v
      setTimeout(() => reply(true, `温度阈值已更新为 ${v}℃`), 200)
      break
    }
    case 'reboot': {
      // 重启剧本：先下线（retained），2.5s 后带档案重新上线并回执
      publish(
        client,
        `${base0(state)}/up/status`,
        { online: false, reason: 'rebooting' },
        { qos: 1, retain: true },
      )
      setTimeout(() => {
        publish(
          client,
          `${base0(state)}/up/status`,
          {
            online: true,
            name: state.def.name,
            product: { id: state.productId, name: PRODUCT_NAMES[state.productId] },
            fw: 'v1.4.2',
            ip: state.ip,
          },
          { qos: 1, retain: true },
        )
        reply(true, '设备已完成重启')
      }, 2500)
      break
    }
    default:
      reply(false, `不支持指令: ${action}`)
  }
}

const base0 = (state) => state.base

/** 导出给 server/index.mjs 组合使用；直接 node simulator.mjs 也可独立运行 */
export function startFleet() {
  DEVICES.forEach((def) => startDevice(def))
  console.log(`[simulator] ${DEVICES.length} 台设备正在接入 ${BROKER_URL}`)
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  startFleet()
  process.on('SIGINT', () => process.exit(0))
}
