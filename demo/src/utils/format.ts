/** 展示层格式化工具：数值/时钟/相对时间 */

export function fmtNum(v: number | undefined, digits = 1): string {
  if (v === undefined || !Number.isFinite(v)) return '--'
  return v.toFixed(digits)
}

export function fmtClock(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** "x 秒前"人类可读相对时间（设备最后上报时间展示用） */
export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 5) return '刚刚'
  if (s < 60) return `${s} 秒前`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return fmtClock(ts)
}
