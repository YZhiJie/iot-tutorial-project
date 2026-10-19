<script setup lang="ts">
/**
 * 远程控制面板：开关（插座）/ 温度阈值（传感器）/ 重启
 *
 * 指令生命周期（RPC over MQTT，docs 3.4）：
 *   pending（等待回执） → ok | rejected（设备拒绝） | timeout（回执超时）
 * 交互约束：离线设备/连接未就绪时禁止下发（发了也没人收的"假指令"）。
 */
import { computed, ref } from 'vue'

import { CONFIG } from '@/config'
import { useIot } from '@/composables/useIot'
import { uuid } from '@/utils/uuid'
import { useConnectionStore } from '@/stores/connection'
import { useDevicesStore } from '@/stores/devices'
import type { CommandAction } from '@/types/iot'

const props = defineProps<{ deviceId: string }>()

const devices = useDevicesStore()
const conn = useConnectionStore()
const { getGateway } = useIot()

const entry = computed(() => devices.map[props.deviceId])
const isPlug = computed(() => entry.value?.profile?.productId === 'pl01')
const canControl = computed(() => Boolean(entry.value?.online) && conn.isConnected)

const thresholdInput = ref<number | null>(null)

type LogStatus = 'pending' | 'ok' | 'rejected' | 'timeout'
interface CommandLog {
  id: string
  label: string
  status: LogStatus
  message: string
  sentAt: number
}
const logs = ref<CommandLog[]>([])

function logText(s: LogStatus): string {
  return { pending: '执行中', ok: '成功', rejected: '被拒绝', timeout: '超时' }[s]
}

async function send(
  label: string,
  action: CommandAction,
  params?: Record<string, unknown>,
): Promise<void> {
  const e = entry.value
  if (!e?.profile || !canControl.value) return
  const id = uuid()
  logs.value.unshift({ id, label, status: 'pending', message: '等待设备回执…', sentAt: Date.now() })
  if (logs.value.length > 20) logs.value.pop()

  const outcome = await getGateway().publishCommand(
    props.deviceId,
    e.profile.productId,
    action,
    params,
  )

  const log = logs.value.find((l) => l.id === id)
  if (!log) return
  log.status = outcome.status === 'ok' ? 'ok' : outcome.status
  log.message =
    outcome.status === 'timeout'
      ? `${CONFIG.commandTimeoutMs / 1000}s 内未收到设备回执`
      : outcome.message || outcome.status
}

function toggleSwitch(): void {
  void send('开关', 'switch', { on: !entry.value?.on })
}

function applyThreshold(): void {
  if (thresholdInput.value === null) return
  void send('温度阈值', 'setThreshold', { tempMax: thresholdInput.value })
}

function reboot(): void {
  void send('重启设备', 'reboot')
}
</script>

<template>
  <div class="panel">
    <h3 class="panel-title">远程控制</h3>
    <p v-if="!canControl" class="panel-hint">设备离线或连接未就绪，指令已禁用。</p>

    <div class="ctrl-row">
      <template v-if="isPlug">
        <button class="btn" :disabled="!canControl" @click="toggleSwitch">
          {{ entry?.on ? '关闭插座' : '打开插座' }}
        </button>
      </template>
      <template v-else>
        <input
          v-model.number="thresholdInput"
          class="input"
          type="number"
          min="20"
          max="60"
          :placeholder="`温度阈值（当前 ${entry?.tempThreshold ?? '--'}℃）`"
        />
        <button
          class="btn"
          :disabled="!canControl || thresholdInput === null"
          @click="applyThreshold"
        >
          设置阈值
        </button>
      </template>
      <button class="btn btn-danger" :disabled="!canControl" @click="reboot">重启设备</button>
    </div>

    <div v-if="logs.length" class="cmd-logs">
      <div v-for="l in logs" :key="l.id" class="cmd-log" :class="`is-${l.status}`">
        <span class="cmd-status">{{ logText(l.status) }}</span>
        <span class="cmd-label">{{ l.label }}</span>
        <span class="cmd-msg">{{ l.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-hint {
  font-size: 12px;
  color: var(--warn);
  margin: 8px 0;
}
.ctrl-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
}
.cmd-logs {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cmd-log {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(148, 163, 184, 0.06);
  border-radius: 6px;
}
.cmd-status {
  flex: none;
  font-weight: 600;
}
.cmd-log.is-pending .cmd-status {
  color: var(--warn);
}
.cmd-log.is-ok .cmd-status {
  color: var(--ok);
}
.cmd-log.is-rejected .cmd-status,
.cmd-log.is-timeout .cmd-status {
  color: var(--err);
}
.cmd-label {
  flex: none;
}
.cmd-msg {
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
