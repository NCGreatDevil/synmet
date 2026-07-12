<template>
  <div class="max-w-[800px] mx-auto p-8 text-center font-[Inter,system-ui,Avenir,Helvetica,Arial,sans-serif]">
    <h1 class="text-3xl text-[#213547]">{{ message }}</h1>
    <div class="mt-8">
      <p>Count: {{ count }}</p>
      <button
        class="px-4 py-2 text-base cursor-pointer border border-[#213547] rounded bg-[#f9f9f9] transition-colors duration-200 hover:bg-[#e0e0e0]"
        @click="increment"
      >Increment</button>
    </div>

    <div class="mt-8" v-if="authStore.isAuthenticated">
      <p>欢迎, {{ authStore.currentUser?.username || authStore.currentUser?.name || authStore.currentUser?.email }}</p>
      <n-button text type="error" @click="handleLogout">退出登录</n-button>
    </div>
    <div class="mt-8" v-else>
      <router-link to="/login" class="inline-block px-6 py-3 text-base text-white bg-[#1677ff] rounded-lg no-underline transition-colors duration-200 hover:bg-[#4096ff] m-2">登录</router-link>
      <router-link to="/register" class="inline-block px-6 py-3 text-base text-white bg-[#1677ff] rounded-lg no-underline transition-colors duration-200 hover:bg-[#4096ff] m-2">注册</router-link>
    </div>

    <div class="mt-8">
      <router-link to="/square" class="inline-block px-6 py-3 text-base text-white bg-[#1677ff] rounded-lg no-underline transition-colors duration-200 hover:bg-[#4096ff] m-2">进入社交关系图谱</router-link>
      <router-link to="/test-mob" class="inline-block px-6 py-3 text-base text-white bg-[#1677ff] rounded-lg no-underline transition-colors duration-200 hover:bg-[#4096ff] m-2">进入移动端社交图谱</router-link>
      <router-link v-if="authStore.isAdmin" to="/users" class="inline-block px-6 py-3 text-base text-white bg-[#1677ff] rounded-lg no-underline transition-colors duration-200 hover:bg-[#4096ff] m-2">用户管理</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const message = ref('Hello Vue 3 + TypeScript + Vite')
const count = ref(0)
const messageService = useMessage()
const authStore = useAuthStore()

function increment() {
  count.value++
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    messageService.success('退出成功')
  } catch {
    messageService.error('退出失败')
  }
}
</script>

