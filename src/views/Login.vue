<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
    <div class="w-full max-w-md mx-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">欢迎登录</h1>
          <p class="text-gray-500 mt-2">请输入您的账号信息</p>
        </div>

        <div class="space-y-6">
          <n-form :model="form" label-placement="top">
            <n-form-item label="邮箱" required>
              <n-input
                v-model:value="form.email"
                type="email"
                placeholder="请输入邮箱地址"
                :disabled="loading"
                :input-props="{ autocomplete: 'email' }"
                class="w-full"
              />
            </n-form-item>

            <n-form-item label="密码" required>
              <n-input
                v-model:value="form.password"
                type="password"
                placeholder="请输入密码"
                :disabled="loading"
                show-password
                :input-props="{ autocomplete: 'current-password' }"
                class="w-full"
              />
            </n-form-item>
          </n-form>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember"
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="remember" class="ml-2 text-sm text-gray-600 cursor-pointer">
                记住密码
              </label>
            </div>
          </div>

          <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="w-full"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </n-button>
        </div>

        <div class="mt-6 text-center">
          <p class="text-gray-500">
            还没有账号？
            <n-button text type="primary" @click="$router.push('/register')">
              立即注册
            </n-button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const rememberMe = ref(false)
const form = reactive({
  email: '',
  password: ''
})

onMounted(() => {
  const saved = localStorage.getItem('remembered_credentials')
  if (saved) {
    try {
      const creds = JSON.parse(saved)
      form.email = creds.email || ''
      form.password = creds.password || ''
      rememberMe.value = true
    } catch {}
  }
})

const handleLogin = async () => {
  if (!form.email || !form.password) {
    message.warning('请填写完整的登录信息')
    return
  }

  loading.value = true
  try {
    await authStore.login(form.email, form.password)
    
    if (rememberMe.value) {
      localStorage.setItem('remembered_credentials', JSON.stringify({
        email: form.email,
        password: form.password
      }))
    } else {
      localStorage.removeItem('remembered_credentials')
    }
    
    message.success('登录成功')
    router.push('/')
  } catch (error: any) {
    message.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
