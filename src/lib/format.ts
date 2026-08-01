/**
 * 统一的时间格式化工具函数
 * 所有时间显示均使用北京时间（Asia/Shanghai）
 */

/**
 * 格式化日期为本地日期字符串（北京时间）
 * @example formatDate(new Date()) // "2026-07-21"
 */
export const formatDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

/**
 * 格式化日期时间为本地字符串（北京时间）
 * @example formatDateTime(new Date()) // "2026-07-21 14:30:00"
 */
export const formatDateTime = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

/**
 * 格式化为相对时间（如"刚刚"、"5分钟前"、"2小时前"）
 * @example formatRelativeTime(new Date()) // "刚刚"
 */
export const formatRelativeTime = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return ''
  
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(date)
}
