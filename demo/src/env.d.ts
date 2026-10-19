/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MQTT Broker 的 WebSocket 地址 */
  readonly VITE_MQTT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
