/**
 * ECharts 生命周期封装：init / resize（ResizeObserver）/ dispose 三件套
 *
 * 两个经典坑（docs 2.2）：
 * 1. 组件卸载不 dispose → 实例与事件监听泄漏；
 * 2. 容器尺寸变化不调用 resize → 曲线压扁/错位。
 * 该封装保证二者与组件生命周期严格绑定。
 */
import * as echarts from 'echarts'
import { onBeforeUnmount, ref, type Ref } from 'vue'

export function useECharts(hostRef: Ref<HTMLElement | null>) {
  let chart: echarts.ECharts | null = null
  let ro: ResizeObserver | null = null
  const ready = ref(false)

  /** 惰性初始化：宿主元素渲染完成前返回 null，调用方需判空 */
  function ensure(): echarts.ECharts | null {
    if (chart || !hostRef.value) return chart
    chart = echarts.init(hostRef.value)
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(hostRef.value)
    ready.value = true
    return chart
  }

  function setOption(
    option: echarts.EChartsCoreOption,
    opts?: { notMerge?: boolean; lazyUpdate?: boolean },
  ): void {
    const c = ensure()
    c?.setOption(option, { lazyUpdate: true, ...opts })
  }

  onBeforeUnmount(() => {
    ro?.disconnect()
    ro = null
    chart?.dispose()
    chart = null
    ready.value = false
  })

  return { ensure, setOption, ready }
}
