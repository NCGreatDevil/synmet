<template>
  <div class="max-w-[800px] mx-auto p-8 text-center">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Synmet 社交关系图谱</h1>

    <!-- 已登录状态 -->
    <div v-if="authStore.isAuthenticated" class="mt-8">
      <p class="text-lg text-gray-600 mb-4">
        欢迎, {{ authStore.currentUser?.username || authStore.currentUser?.name || authStore.currentUser?.email }}
      </p>
      <n-button text type="error" @click="handleLogout">退出登录</n-button>
    </div>

    <!-- 未登录状态 -->
    <div v-else class="mt-8">
      <router-link to="/login" class="inline-block px-6 py-3 text-base text-white bg-blue-500 rounded-lg no-underline transition-colors duration-200 hover:bg-blue-600 m-2">
        登录
      </router-link>
      <router-link to="/register" class="inline-block px-6 py-3 text-base text-white bg-blue-500 rounded-lg no-underline transition-colors duration-200 hover:bg-blue-600 m-2">
        注册
      </router-link>
    </div>

    <!-- 导航链接 -->
    <div class="mt-8">
      <router-link to="/square" class="inline-block px-6 py-3 text-base text-white bg-blue-500 rounded-lg no-underline transition-colors duration-200 hover:bg-blue-600 m-2">
        进入社交关系图谱
      </router-link>
      <router-link to="/test-mob" class="inline-block px-6 py-3 text-base text-white bg-blue-500 rounded-lg no-underline transition-colors duration-200 hover:bg-blue-600 m-2">
        进入移动端社交图谱
      </router-link>
      <router-link v-if="authStore.isAdmin" to="/users" class="inline-block px-6 py-3 text-base text-white bg-blue-500 rounded-lg no-underline transition-colors duration-200 hover:bg-blue-600 m-2">
        用户管理
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const message = useMessage()
const authStore = useAuthStore()

/** 处理退出登录 */
const handleLogout = async () => {
  try {
    await authStore.logout()
    message.success('退出成功')
  } catch {
    message.error('退出失败')
  }
}
</script>
