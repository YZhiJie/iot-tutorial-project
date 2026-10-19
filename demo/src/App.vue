<script setup lang="ts">
/**
 * 应用外壳：侧边导航 + 主区域 + 全局连接指示器 + 告警横幅
 * IoT 网关在此启动（整个应用生命周期只有一份 MQTT 连接）。
 */
import { onMounted, onUnmounted } from 'vue'

import AlertBanner from '@/components/AlertBanner.vue'
import ConnectionIndicator from '@/components/ConnectionIndicator.vue'
import { useIot } from '@/composables/useIot'
import { useAlertsStore } from '@/stores/alerts'

const { start, stop } = useIot()
const alerts = useAlertsStore()

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-dot" />
        <div>
          <div class="brand-name">IoT Deck</div>
          <div class="brand-sub">设备监控台</div>
        </div>
      </div>
      <nav class="nav">
        <RouterLink class="nav-item" to="/devices">
          <span class="ico">▦</span>
          <span>设备列表</span>
        </RouterLink>
        <RouterLink class="nav-item" to="/alerts">
          <span class="ico">◈</span>
          <span>告警中心</span>
          <span v-if="alerts.unreadCount > 0" class="badge">{{ alerts.unreadCount }}</span>
        </RouterLink>
      </nav>
      <footer class="sidebar-foot">
        <ConnectionIndicator />
      </footer>
    </aside>
    <main class="main">
      <RouterView />
    </main>
    <AlertBanner />
  </div>
</template>
