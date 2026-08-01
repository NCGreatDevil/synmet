/** 用户在线状态 */
export type UserStatus = 'active' | 'online' | 'offline'

/** 广场节点用户数据 */
export interface UserData {
  id: string
  name: string
  avatar: string
  bio: string
  tags: string[]
  status: UserStatus
  interaction: number
  popularity: number
  gender?: number
  age?: number | null
  isOnline?: boolean          // 在线状态（用于 computeStatus 重新计算）
  lastActiveAt?: string       // 最后活跃时间 ISO 字符串（用于 computeStatus 重新计算）
}
