<script setup lang="ts">
/**
 * 实时遥测曲线（ECharts）
 *
 * 更新策略（docs 4.2）：不逐消息重绘 —— 800ms 定时从 store 滑窗取数批量 setOption，
 * 把「每秒 N 条消息」与「图表帧率」解耦；notMerge 保证设备切换后序列不残留。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useECharts } from '@/composables/useECharts'
import { useDevicesStore } from '@/stores/devices'
import { fmtClock } from '@/utils/format'

const props = defineProps<{ deviceId: string }>()

const devices = useDevicesStore()
const entry = computed(() => devices.map[props.deviceId])
const hostRef = ref<HTMLElement | null>(null)
const { ensure, setOption } = useECharts(hostRef)

type MetricKey = 'temp' | 'humi' | 'power' | 'voltage'
interface SeriesDef {
  key: MetricKey
  name: string
  color: string
}

const seriesDef = computed<SeriesDef[]>(() =>
  entry.value?.profile?.productId === 'pl01'
    ? [
        { key: 'power', name: '功率 (W)', color: '#f59e0b' },
        { key: 'voltage', name: '电压 (V)', color: '#38bdf8' },
      ]
    : [
        { key: 'temp', name: '温度 (℃)', color: '#fb7185' },
        { key: 'humi', name: '湿度 (%RH)', color: '#38bdf8' },
      ],
)

function render(): void {
  const e = entry.value
  if (!ensure()) return
  const win = e?.window ?? []
  const series = seriesDef.value.map((s) => ({
    name: s.name,
    type: 'line',
    showSymbol: false,
    smooth: true,
    data: win.map((p) => [p.ts, p[s.key] ?? null]),
    lineStyle: { color: s.color, width: 1.5 },
    itemStyle: { color: s.color },
    // 传感器才画阈值线；阈值来自设备侧 setThreshold 的最新值
    ...(s.key === 'temp' && e
      ? {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#f43f5e', type: 'dashed' },
            data: [
              {
                yAxis: e.tempThreshold,
                label: { formatter: `阈值 ${e.tempThreshold}℃`, color: '#f43f5e' },
              },
            ],
          },
        }
      : {}),
  }))

  setOption(
    {
      backgroundColor: 'transparent',
      grid: { left: 52, right: 18, top: 34, bottom: 36 },
      legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 12 } },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: 'rgba(148,163,184,0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (v: number) => fmtClock(v) },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      },
      series,
    },
    { notMerge: true },
  )
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  render()
  timer = setInterval(render, 800)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div ref="hostRef" class="chart-host" />
</template>

<style scoped>
.chart-host {
  height: 320px;
  width: 100%;
}
</style>
