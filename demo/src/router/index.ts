/**
 * 路由：设备列表 / 设备详情 / 告警中心 三视图
 * 懒加载视图组件，详情页通过 props: true 传 deviceId。
 */
import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/devices' },
    {
      path: '/devices',
      name: 'device-list',
      component: () => import('@/views/DeviceListView.vue'),
      meta: { title: '设备列表' },
    },
    {
      path: '/devices/:deviceId',
      name: 'device-detail',
      component: () => import('@/views/DeviceDetailView.vue'),
      props: true,
      meta: { title: '设备详情' },
    },
    {
      path: '/alerts',
      name: 'alert-center',
      component: () => import('@/views/AlertCenterView.vue'),
      meta: { title: '告警中心' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/devices' },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · IoT Deck` : 'IoT Deck'
})

export default router
