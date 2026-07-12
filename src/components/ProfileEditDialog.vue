<template>
  <NModal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="dialog"
    title="编辑个人资料"
    :style="{ width: '500px', maxWidth: '90vw' }"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="80px"
    >
      <NFormItem label="头像">
        <div class="avatar-upload">
          <NAvatar :size="80" round :src="getAvatarUrl(formData.avatar)" />
          <NButton size="small" @click="handleAvatarChange" class="mt-2">
            更换头像
          </NButton>
        </div>
      </NFormItem>

      <NFormItem label="用户名" path="username">
        <NInput v-model:value="formData.username" placeholder="请输入用户名" />
      </NFormItem>

      <NFormItem label="邮箱">
        <NInput :value="authStore.currentUser?.email || ''" disabled />
      </NFormItem>

      <NFormItem label="性别">
        <NRadioGroup v-model:value="formData.gender">
          <NRadio :value="1">男</NRadio>
          <NRadio :value="2">女</NRadio>
          <NRadio :value="0">保密</NRadio>
        </NRadioGroup>
      </NFormItem>

      <NFormItem label="年龄" path="age">
        <NInputNumber
          v-model:value="formData.age"
          :min="18"
          :max="100"
          placeholder="请输入年龄"
          style="width: 100%"
        />
      </NFormItem>

      <NFormItem label="个人简介" path="bio">
        <NInput
          v-model:value="formData.bio"
          type="textarea"
          placeholder="请输入个人简介"
          :rows="4"
        />
      </NFormItem>
    </NForm>

    <template #action>
      <NSpace justify="end">
        <NButton @click="$emit('update:show', false)">取消</NButton>
        <NButton type="primary" :loading="saving" @click="handleSave">
          保存
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NInput, NInputNumber,
  NRadioGroup, NRadio, NButton, NAvatar, NSpace,
  useMessage, type FormInst, type FormRules
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import pb, { getUserAvatarUrl, getDefaultAvatar } from '@/lib/pocketbase'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  saved: []
}>()

const message = useMessage()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const saving = ref(false)

const formData = reactive({
  username: '',
  avatar: '',
  gender: 0,
  age: null as number | null,
  bio: ''
})

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  gender: [],
  age: [
    { type: 'number', min: 18, max: 100, message: '年龄必须在18-100之间', trigger: 'blur' }
  ]
}

const getAvatarUrl = (avatarFilename: string) => {
  if (!authStore.currentUser) return getDefaultAvatar(formData.gender)
  if (!avatarFilename) return getDefaultAvatar(formData.gender)
  return getUserAvatarUrl({ id: authStore.currentUser.id, avatar: avatarFilename, gender: formData.gender })
}

watch(() => props.show, (val) => {
  if (val && authStore.currentUser) {
    const u = authStore.currentUser
    formData.username = u.username || u.name || ''
    formData.avatar = u.avatar || ''
    formData.gender = Number(u.gender) || 0
    formData.age = u.age ? Number(u.age) : null
    formData.bio = u.bio || ''
  }
})

const handleAvatarChange = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !authStore.currentUser) return

    try {
      const data = new FormData()
      data.append('avatar', file)
      const updated = await pb.collection('users').update(authStore.currentUser.id, data)
      formData.avatar = updated.avatar || ''
      authStore.currentUser = updated as any
      message.success('头像更新成功')
    } catch (error) {
      console.error('头像上传失败:', error)
      message.error('头像上传失败')
    }
  }
  input.click()
}

const handleSave = async () => {
  if (!formRef.value || !authStore.currentUser) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const updated = await pb.collection('users').update(authStore.currentUser.id, {
      username: formData.username,
      name: formData.username,
      gender: formData.gender,
      age: formData.age,
      bio: formData.bio
    })

    authStore.currentUser = updated as any
    message.success('保存成功')
    emit('saved')
    emit('update:show', false)
  } catch (error: any) {
    console.error('保存失败:', error)
    message.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mt-2 {
  margin-top: 8px;
}
</style>
