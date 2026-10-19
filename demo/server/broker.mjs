/**
 * 文件: server/broker.mjs
 * 本地 MQTT Broker（教学用，aedes 内存实现，重启即清空，不落盘）
 *
 * 监听两个入口，对应物联网系统里"设备侧"与"前端侧"两条接入链路：
 *   - TCP 1883          ：设备模拟器等原生 MQTT 客户端（真实设备一般是 TCP/TLS）
 *   - WebSocket 8083    ：浏览器端 mqtt.js 走 MQTT over WebSocket（路径 /mqtt）
 *
 * 启动：pnpm server（推荐，会同时拉起设备模拟器）或 pnpm broker
 */
import { createServer as createHttpServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'

import websocketStream from 'websocket-stream'
// aedes 1.x 不再支持默认导出/直接 new：使用命名导出 + createBroker()
import { Aedes } from 'aedes'

// createBroker 是异步工厂（返回 Promise<Broker>），用顶层 await 等待就绪
const aedes = await Aedes.createBroker()

// 1) TCP 入口：设备侧原生 MQTT
createTcpServer(aedes.handle).listen(1883, () => {
  console.log('[broker] TCP 已就绪 mqtt://localhost:1883（设备侧）')
})

// 2) WebSocket 入口：浏览器侧 MQTT over WS
//    websocket-stream 把 WebSocket 包装成 aedes 需要的 duplex 流
const httpServer = createHttpServer()
websocketStream.createServer({ server: httpServer, path: '/mqtt' }, aedes.handle)
httpServer.listen(8083, () => {
  console.log('[broker] WS  已就绪 ws://localhost:8083/mqtt（前端侧）')
})

// —— 观察性日志：教程联调时盯着这块看消息流最直观 ——
aedes.on('client', (client) => console.log(`[broker] 接入 +  ${client.id}`))
aedes.on('clientDisconnect', (client) => console.log(`[broker] 断开 -  ${client.id}`))
aedes.on('publish', (packet, client) => {
  if (client && packet.topic.startsWith('iot/')) {
    console.log(
      `[broker] ${client.id} → ${packet.topic} (${packet.payload.length}B, qos${packet.qos})`,
    )
  }
})
