<script setup lang="ts">
/**
 * 设备列表视图：统计条 + 搜索/过滤 + 卡片网格
 * 数据源：stores/devices（消息驱动写入，这里只做派生与筛选）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import DeviceCard from '@/components/DeviceCard.vue'
import { useAlertsStore } from '@/stores/alerts'
import { useDevicesStore } from '@/stores/devices'

const devices = useDevicesStore()
const alerts = useAlertsStore()
const router = useRouter()

const keyword = ref('')
const filter = ref<'all' | 'online' | 'offline'>('all')

const filtered = computed(() =>
  devices.list.filter((e) => {
    const name = `${e.profile?.name ?? ''} ${e.profile?.deviceId ?? ''}`.toLowerCase()
    if (keyword.value && !name.includes(keyword.value.trim().toLowerCase())) return false
    if (filter.value === 'online' && !e.online) return false
    if (filter.value === 'offline' && e.online) return false
    return true
  }),
)

// 卡片"上报于 x 秒前"需要周期性刷新 now 触发重渲染
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
    <h1 class="page-title">设备列表</h1>
    <p class="page-sub">
      共 {{ devices.list.length }} 台 · 在线 {{ devices.onlineCount }} · 离线
      {{ devices.offlineCount }} · 未读告警 {{ alerts.unreadCount }}
    </p>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索设备名称 / ID…" />
      <select v-model="filter" class="input select">
        <option value="all">全部设备</option>
        <option value="online">仅在线</option>
        <option value="offline">仅离线</option>
      </select>
    </div>

    <div v-if="filtered.length" class="card-grid">
      <DeviceCard
        v-for="e in filtered"
        :key="e.profile?.deviceId ?? '?'"
        :entry="e"
        :now="now"
        @click="router.push(`/devices/${e.profile?.deviceId ?? ''}`)"
      />
    </div>
    <div v-else class="empty-state">没有匹配的设备（等待设备上报档案中…）</div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
.toolbar .input {
  max-width: 260px;
}
</style>
