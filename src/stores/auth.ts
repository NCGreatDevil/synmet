import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '@/lib/pocketbase'

export interface User {
  id: string
  email: string
  name: string
  avatar: string
  gender: number
  age: number | null
  bio: string
  role: number
  status: number
  is_online: number
  is_admin: boolean
  created: string
  updated: string
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const authValid = ref(pb.authStore.isValid)
  const isAuthenticated = computed(() => authValid.value)
  const isAdmin = computed(() => currentUser.value?.is_admin === true)

  // 监听 PocketBase 认证状态变化，同步到 Vue 响应式系统
  pb.authStore.onChange((_token, model) => {
    authValid.value = !!model
  })

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      const freshUser = await pb.collection('users').getOne(authData.record.id)
      currentUser.value = freshUser as unknown as User
      // 同步更新 authStore.record，确保刷新页面时数据完整
      pb.authStore.save(pb.authStore.token, freshUser)
      await recordLoginLog()
      return true
    } catch (error: any) {
      let errorMsg = error.message || '登录失败'
      if (error.data?.message) {
        errorMsg = error.data.message
      } else if (error.message?.includes('Failed to authenticate')) {
        errorMsg = '邮箱或密码错误'
      } else if (error.message?.includes('not verified')) {
        errorMsg = '账号未验证，请检查邮箱'
      } else if (error.message?.includes('disabled')) {
        errorMsg = '账号已被禁用，请联系管理员'
      }
      throw new Error(errorMsg)
    }
  }

  const logout = async () => {
    try {
      if (currentUser.value) {
        await pb.collection('users').update(currentUser.value.id, { is_online: 0 })
      }
      pb.authStore.clear()
      currentUser.value = null
      localStorage.removeItem('pb_auth_token')
    } catch {
      pb.authStore.clear()
      currentUser.value = null
      localStorage.removeItem('pb_auth_token')
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    gender: number,
    role: number,
    age?: number,
    bio?: string
  ) => {
    try {
      const data: Record<string, any> = {
        email,
        password,
        passwordConfirm: password,
        name,
        gender: Number(gender),
        role: Number(role),
        status: 1,
        is_online: 0,
        emailVisibility: true
      }
      if (age && !isNaN(age)) data.age = Number(age)
      if (bio) data.bio = bio
      const user = await pb.collection('users').create(data)
      await pb.collection('user_stats').create({
        user_id: user.id,
        login_count: 0,
        interaction_count: 0,
        popularity_score: 0
      })
      return true
    } catch (error: any) {
      let errorMsg = error.message || '注册失败'
      if (error.data?.email?.code === 'validation_not_unique') {
        errorMsg = '该邮箱已被注册，请使用其他邮箱'
      } else if (error.data && typeof error.data === 'object') {
        const fields = Object.keys(error.data)
        if (fields.length > 0) {
          errorMsg = `${fields.join(', ')} 字段有错误`
        }
      }
      throw new Error(errorMsg)
    }
  }

  const recordLoginLog = async () => {
    try {
      if (!currentUser.value) return
      await pb.collection('user_login_logs').create({
        user_id: currentUser.value.id,
        login_time: new Date().toISOString(),
        login_ip: '',
        device_type: 'web',
        device_info: navigator.userAgent
      })
      await pb.collection('users').update(currentUser.value.id, { is_online: 1 })
      const stats = await pb.collection('user_stats').getFirstListItem(`user_id="${currentUser.value.id}"`)
      await pb.collection('user_stats').update(stats.id, {
        login_count: (stats.login_count || 0) + 1
      })
    } catch {
    }
  }

  const initAuth = async () => {
    if (pb.authStore.isValid && (pb.authStore as any).record) {
      try {
        const freshUser = await pb.collection('users').getOne((pb.authStore as any).record.id)
        currentUser.value = freshUser as unknown as User
      } catch {
        currentUser.value = (pb.authStore as any).record as unknown as User
      }
    }
  }

  return {
    currentUser,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    register,
    initAuth
  }
})
