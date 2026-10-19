/**
 * IoT 装配层：把「无框架依赖的服务层」接入「Pinia 状态层」
 * App.vue onMounted 调 start()，onUnmounted 调 stop()。
 * 全应用只有一个网关实例（模块级单例），重复 start 直接跳过。
 */
import { IotGateway } from '@/services/mqtt'
import { useAlertsStore } from '@/stores/alerts'
import { useConnectionStore } from '@/stores/connection'
import { useDevicesStore } from '@/stores/devices'

let gateway: IotGateway | null = null

export function useIot() {
  function start(): void {
    if (gateway) return
    const conn = useConnectionStore()
    const devices = useDevicesStore()
    const alerts = useAlertsStore()

    gateway = new IotGateway({
      onConnectionState: (state, attempt, detail) => conn.set(state, attempt, detail),
      onProfile: (deviceId, productId, status) =>
        devices.ingestProfile(deviceId, productId, status),
      onTelemetry: (deviceId, productId, points) =>
        devices.ingestTelemetry(deviceId, productId, points),
      onEvent: (deviceId, productId, ev) => {
        alerts.pushEvent(deviceId, devices.nameOf(deviceId, productId), ev)
      },
      // 指令回执的"业务结果"由 publishCommand 的 Promise 返回给发起组件，
      // 这里只保留一条全局日志便于联调排查
      onCommandReply: (reply) => {
        console.debug('[gateway] 指令回执', reply)
      },
    })
    gateway.start()
    devices.startWatchdog()
  }

  function stop(): void {
    gateway?.stop()
    gateway = null
    useDevicesStore().stopWatchdog()
  }

  /** 组件内获取网关下发指令；须在 App 启动后调用（交互时机天然满足） */
  function getGateway(): IotGateway {
    if (!gateway) throw new Error('IoT 网关尚未启动')
    return gateway
  }

  return { start, stop, getGateway }
}
