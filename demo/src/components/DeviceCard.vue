<script setup lang="ts">
/**
 * 设备卡片：档案 + 在线徽标 + 最新遥测值 + 上报时间
 * 展示字段按产品类型收敛（传感器 vs 插座），数据缺省展示 '--'
 */
import { computed } from 'vue'

import type { DeviceEntry } from '@/stores/devices'
import { fmtNum, timeAgo } from '@/utils/format'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{ entry: DeviceEntry; now: number }>()

interface Metric {
  label: string
  value: string
}

const metrics = computed<Metric[]>(() => {
  const l = props.entry.latest
  if (!l) return []
  if (props.entry.profile?.productId === 'pl01') {
    return [
      { label: '功率', value: `${fmtNum(l.power, 0)} W` },
      { label: '电压', value: `${fmtNum(l.voltage, 0)} V` },
      { label: '开关', value: l.on ? '开' : '关' },
    ]
  }
  return [
    { label: '温度', value: `${fmtNum(l.temp, 1)} ℃` },
    { label: '湿度', value: `${fmtNum(l.humi, 0)} %RH` },
    { label: '电量', value: `${fmtNum(l.battery, 0)} %` },
  ]
})

const title = computed(
  () => props.entry.profile?.name ?? props.entry.profile?.deviceId ?? '(等待设备档案)',
)
const sub = computed(() => {
  const p = props.entry.profile
  return p ? `${p.productName} · ${p.deviceId}` : (props.entry.profile?.deviceId ?? '')
})
const seenText = computed(() =>
  props.entry.lastSeenAt > 0 ? `上报于 ${timeAgo(props.entry.lastSeenAt, props.now)}` : '尚未上报',
)
</script>

<template>
  <div class="device-card">
    <div class="card-head">
      <div class="card-title">
        <div class="card-name">{{ title }}</div>
        <div class="card-sub">{{ sub }}</div>
      </div>
      <StatusBadge :online="entry.online" />
    </div>
    <div class="card-metrics">
      <div v-for="m in metrics" :key="m.label" class="metric">
        <div class="metric-label">{{ m.label }}</div>
        <div class="metric-value">{{ m.value }}</div>
      </div>
      <div v-if="metrics.length === 0" class="metric-empty">等待数据…</div>
    </div>
    <div class="card-foot">
      {{ seenText }}<span v-if="entry.profile?.fw"> · fw {{ entry.profile.fw }}</span>
    </div>
  </div>
</template>

<style scoped>
.device-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  transition:
    border-color 0.15s,
    transform 0.15s;
}
.device-card:hover {
  border-color: rgba(56, 189, 248, 0.45);
  transform: translateY(-2px);
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
}
.card-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-dim);
}
.card-metrics {
  display: flex;
  gap: 18px;
  margin: 14px 0 10px;
  min-height: 44px;
}
.metric-label {
  font-size: 12px;
  color: var(--text-dim);
}
.metric-value {
  margin-top: 2px;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.metric-empty {
  align-self: center;
  font-size: 12px;
  color: var(--text-dim);
}
.card-foot {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
