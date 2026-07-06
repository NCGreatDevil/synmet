<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
    <div class="w-full max-w-lg mx-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">注册账号</h1>
          <p class="text-gray-500 mt-2">创建您的新账号</p>
        </div>

        <n-form :model="form" label-placement="top" class="space-y-5">
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

          <n-form-item label="用户名" required>
            <n-input
              v-model:value="form.name"
              placeholder="请输入用户名"
              :disabled="loading"
              :input-props="{ autocomplete: 'username' }"
              class="w-full"
            />
          </n-form-item>

          <n-form-item label="密码" required>
            <n-input
              v-model:value="form.password"
              type="password"
              placeholder="请输入密码（至少8位）"
              :disabled="loading"
              show-password
              :input-props="{ autocomplete: 'new-password' }"
              class="w-full"
            />
          </n-form-item>

          <n-form-item label="确认密码" required>
            <n-input
              v-model:value="form.passwordConfirm"
              type="password"
              placeholder="请再次输入密码"
              :disabled="loading"
              show-password
              :input-props="{ autocomplete: 'new-password' }"
              class="w-full"
            />
          </n-form-item>

          <n-form-item label="性别" required>
            <n-space>
              <n-radio-group v-model:value="form.gender" :disabled="loading">
                <n-radio value="0">保密</n-radio>
                <n-radio value="1">男</n-radio>
                <n-radio value="2">女</n-radio>
              </n-radio-group>
            </n-space>
          </n-form-item>

          <n-form-item label="角色" required>
            <n-space>
              <n-radio-group v-model:value="form.role" :disabled="loading">
                <n-radio value="0">普通用户</n-radio>
                <n-radio value="1">红娘用户</n-radio>
              </n-radio-group>
            </n-space>
          </n-form-item>

          <n-form-item label="年龄">
            <n-input
              v-model:value="form.age"
              type="number"
              placeholder="请输入年龄（选填）"
              :disabled="loading"
              class="w-full"
            />
          </n-form-item>

          <n-form-item label="个人简介">
            <n-input
              v-model:value="form.bio"
              type="textarea"
              placeholder="请输入个人简介（选填，最多500字）"
              :disabled="loading"
              :maxlength="500"
              class="w-full"
            />
          </n-form-item>

          <n-form-item>
            <n-button
              type="primary"
              block
              size="large"
              :loading="loading"
              @click="handleRegister"
              class="w-full"
            >
              {{ loading ? '注册中...' : '注 册' }}
            </n-button>
          </n-form-item>
        </n-form>

        <div class="mt-6 text-center">
          <p class="text-gray-500">
            已有账号？
            <n-button text type="primary" @click="$router.push('/login')">
              立即登录
            </n-button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const loading = ref(false)
const form = reactive({
  email: '',
  name: '',
  password: '',
  passwordConfirm: '',
  gender: '0',
  role: '0',
  age: '',
  bio: ''
})

const handleRegister = async () => {
  if (!form.email || !form.name || !form.password || !form.passwordConfirm) {
    message.warning('请填写完整的注册信息')
    return
  }

  if (form.password.length < 8) {
    message.warning('密码长度至少为8位')
    return
  }

  if (form.password !== form.passwordConfirm) {
    message.warning('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await authStore.register(
      form.email,
      form.password,
      form.name,
      parseInt(form.gender),
      parseInt(form.role),
      form.age ? parseInt(form.age) : undefined,
      form.bio || undefined
    )
    message.success('注册成功，请登录')
    router.push('/login')
  } catch (error: any) {
    message.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>
