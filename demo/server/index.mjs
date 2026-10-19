/**
 * 文件: server/index.mjs
 * 开发态推荐入口：一条命令同时拉起 Broker（1883/8083）+ 设备模拟器
 * 模拟器稍等 800ms 再接入，确保 Broker 日志先打印就绪信息。
 */
import './broker.mjs'
import { startFleet } from './simulator.mjs'

setTimeout(() => {
  startFleet()
}, 800)

process.on('SIGINT', () => process.exit(0))
