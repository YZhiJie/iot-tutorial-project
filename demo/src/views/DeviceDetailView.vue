<script setup lang="ts">
/**
 * 设备详情视图：档案头 + 实时曲线 + 远程控制 + 最近事件
 * deviceId 来自路由 props（router props: true）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import ControlPanel from '@/components/ControlPanel.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TelemetryChart from '@/components/TelemetryChart.vue'
import { fmtNum, timeAgo } from '@/utils/format'
import { useAlertsStore } from '@/stores/alerts'
import { useDevicesStore } from '@/stores/devices'

const props = defineProps<{ deviceId: string }>()

const devices = useDevicesStore()
const alerts = useAlertsStore()

const entry = computed(() => devices.map[props.deviceId])
const isPlug = computed(() => entry.value?.profile?.productId === 'pl01')
const deviceEvents = computed(() =>
  alerts.list.filter((a) => a.deviceId === props.deviceId).slice(0, 6),
)

// 头部"上报于 x 秒前"周期刷新
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 5000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <div v-if="entry" class="detail-head">
      <div>
        <h1 class="page-title">{{ entry.profile?.name ?? deviceId }}</h1>
        <p class="page-sub">
          {{ entry.profile?.productName ?? '' }} · {{ deviceId }}
          <template v-if="entry.profile?.fw"> · fw {{ entry.profile.fw }}</template>
          <template v-if="entry.profile?.ip"> · {{ entry.profile.ip }}</template>
          · <StatusBadge :online="entry.online" />
          <template v-if="entry.lastSeenAt">
            · 上报于 {{ timeAgo(entry.lastSeenAt, now) }}</template
          >
        </p>
      </div>
      <div v-if="entry.latest" class="latest-chips">
        <template v-if="isPlug">
          <span class="chip">功率 {{ fmtNum(entry.latest.power, 0) }} W</span>
          <span class="chip">电压 {{ fmtNum(entry.latest.voltage, 0) }} V</span>
          <span class="chip">{{ entry.latest.on ? '开关：开' : '开关：关' }}</span>
        </template>
        <template v-else>
          <span class="chip">温度 {{ fmtNum(entry.latest.temp, 1) }} ℃</span>
          <span class="chip">湿度 {{ fmtNum(entry.latest.humi, 0) }} %RH</span>
          <span class="chip">电量 {{ fmtNum(entry.latest.battery, 0) }} %</span>
          <span class="chip">RSSI {{ fmtNum(entry.latest.rssi, 0) }} dBm</span>
        </template>
      </div>
    </div>
    <div v-else class="empty-state panel">
      设备 {{ deviceId }} 尚未上报任何数据（档案经 up/status 保留消息注册，稍候自动出现）。
    </div>

    <div v-if="entry" class="panel">
      <h3 class="panel-title">实时遥测</h3>
      <TelemetryChart :device-id="deviceId" />
    </div>

    <ControlPanel v-if="entry" :device-id="deviceId" />

    <div v-if="entry && deviceEvents.length" class="panel">
      <h3 class="panel-title">最近事件</h3>
      <div class="event-list">
        <div v-for="ev in deviceEvents" :key="ev.id" class="event-row">
          <span class="level-tag" :class="`level-${ev.level}`">{{ ev.level }}</span>
          <span class="event-time">{{ timeAgo(ev.ts, now) }}</span>
          <span class="event-msg">{{ ev.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.latest-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.event-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.event-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.event-time {
  flex: none;
  font-size: 12px;
  color: var(--text-dim);
}
.event-msg {
  min-width: 0;
}
.level-tag {
  flex: none;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}
.level-info {
  background: rgba(56, 189, 248, 0.15);
  color: var(--accent);
}
.level-warn {
  background: rgba(251, 191, 36, 0.15);
  color: var(--warn);
}
.level-error {
  background: rgba(248, 113, 113, 0.18);
  color: var(--err);
}
</style>
