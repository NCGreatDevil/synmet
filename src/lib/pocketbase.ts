import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

const BASE_URL = 'https://synmet.ma.cloud-ip.cc'

// 默认头像（根据性别）
import avatarMale from '@/assets/images/avatar-male.png'
import avatarFemale from '@/assets/images/avatar-female.png'
import avatarUnknown from '@/assets/images/avatar-unknown.png'

const DEFAULT_AVATARS: Record<number, string> = {
  1: avatarMale,
  2: avatarFemale,
  0: avatarUnknown
}

export const getDefaultAvatar = (gender: number = 0) => {
  return DEFAULT_AVATARS[gender] || DEFAULT_AVATARS[0]
}

export const getUserAvatarUrl = (user: { id: string; avatar: string; gender?: number } | null | undefined) => {
  if (!user) {
    return getDefaultAvatar(0)
  }
  // 检查 avatar 是否为空字符串或不存在
  if (!user.avatar || user.avatar.trim() === '') {
    return getDefaultAvatar(user.gender ?? 0)
  }
  // 使用相对路径，通过 Vite 代理避免 CORS 问题
  return `/api/files/_pb_users_auth_/${user.id}/${user.avatar}`
}

// 从 localStorage 恢复登录状态
const savedToken = localStorage.getItem('pb_auth_token')
const savedUser = localStorage.getItem('pb_auth_user')
if (savedToken) {
  let savedRecord = null
  if (savedUser) {
    try {
      savedRecord = JSON.parse(savedUser)
    } catch {}
  }
  pb.authStore.save(savedToken, savedRecord)
}

// 监听认证状态变化，同步保存到 localStorage
pb.authStore.onChange(() => {
  localStorage.setItem('pb_auth_token', pb.authStore.token)
  const record = (pb.authStore as any).record
  if (record) {
    localStorage.setItem('pb_auth_user', JSON.stringify(record))
  } else {
    localStorage.removeItem('pb_auth_user')
  }
})

export default pb
