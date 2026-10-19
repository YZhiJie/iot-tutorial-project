/**
 * uuid 生成：优先原生 crypto.randomUUID
 *
 * 坑点：randomUUID 仅在安全上下文可用（https / localhost）。
 * 用 http://192.168.x.x 这种局域网 IP 调试时不存在，需要降级方案。
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
