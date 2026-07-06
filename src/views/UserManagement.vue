<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 顶部栏：标题 + 当前用户信息 -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">用户管理</h1>
        <n-dropdown :options="userDropdownOptions" @select="handleUserMenuSelect">
          <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <n-avatar round :size="36" :src="authStore.currentUser?.avatar || undefined">
              {{ authStore.currentUser?.name?.charAt(0) || 'U' }}
            </n-avatar>
            <span class="text-gray-700 font-medium">{{ authStore.currentUser?.name || '用户' }}</span>
          </div>
        </n-dropdown>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6">
        <!-- 操作栏：搜索 + 筛选 + 新增按钮 -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <n-input
              v-model:value="searchKeyword"
              placeholder="搜索用户（邮箱/用户名）"
              style="width: 256px"
              @input="handleSearch"
            >
              <template #prefix>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </n-input>
            <n-select
              v-model:value="roleFilter"
              placeholder="筛选角色"
              :options="roleOptions"
              style="width: 160px"
              @update:value="handleSearch"
            />
            <n-select
              v-model:value="statusFilter"
              placeholder="筛选状态"
              :options="statusOptions"
              style="width: 160px"
              @update:value="handleSearch"
            />
            <n-button secondary type="primary" @click="resetFilters">重置筛选</n-button>
          </div>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </template>
            新增用户
          </n-button>
        </div>

        <n-data-table
          :columns="columns"
          :data="users"
          :pagination="pagination"
          @update:pagination="handlePagination"
          :loading="loading"
        />
      </div>
    </div>

    <n-modal
      v-model:show="showCreateModal"
      preset="dialog"
      :title="editingId ? '编辑用户' : '新增用户'"
      :mask-closable="false"
      class="w-[80%]!"
      @update:show="handleModalClose"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-grid :cols="3" :x-gap="16">
          <n-gi>
            <n-form-item label="邮箱" path="email">
              <n-input v-model:value="form.email" :placeholder="editingId ? '邮箱不可修改' : '请输入邮箱'" :disabled="!!editingId" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="用户名" path="name">
              <n-input v-model:value="form.name" placeholder="请输入用户名" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="性别" path="gender">
              <n-radio-group v-model:value="form.gender">
                <n-radio value="0">保密</n-radio>
                <n-radio value="1">男</n-radio>
                <n-radio value="2">女</n-radio>
              </n-radio-group>
            </n-form-item>
          </n-gi>
         <n-gi>
            <n-form-item label="年龄" path="age">
              <n-input v-model:value="form.age" type="number" placeholder="请输入年龄" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="角色" path="role">
              <n-radio-group v-model:value="form.role">
                <n-radio value="0">普通用户</n-radio>
                <n-radio value="1">红娘用户</n-radio>
              </n-radio-group>
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="管理员">
              <n-checkbox v-model:checked="form.is_admin">是管理员</n-checkbox>
            </n-form-item>
          </n-gi>
          <n-gi v-if="!editingId">
            <n-form-item label="密码" path="password">
              <n-input v-model:value="form.password" type="password" placeholder="请输入密码" />
            </n-form-item>
          </n-gi>
          <n-gi :span="2">
            <n-form-item label="个人简介" path="bio">
              <n-input v-model:value="form.bio" type="textarea" placeholder="请输入个人简介" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-form>
      <template #action>
        <n-button @click="showCreateModal = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="submitForm">
          {{ editingId ? '保存修改' : '创建用户' }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import type { FormInst, FormItemRule, FormRules, DropdownOption } from 'naive-ui'
import { useMessage, useDialog, NTag, NSpace, NButton, NCheckbox, NGrid, NGi, NDropdown, NAvatar } from 'naive-ui'
import { useAuthStore, type User } from '@/stores/auth'
import { useRouter } from 'vue-router'
import pb from '@/lib/pocketbase'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const router = useRouter()

// 用户下拉菜单选项
const userDropdownOptions = computed<DropdownOption[]>(() => [
  { label: `${authStore.currentUser?.name || '用户'} (${authStore.currentUser?.email || ''})`, key: 'info', disabled: true },
  { type: 'divider', key: 'd1' },
  { label: '退出登录', key: 'logout' }
])

// 处理用户菜单选择
const handleUserMenuSelect = (key: string) => {
  if (key === 'logout') {
    dialog.warning({
      title: '确认退出',
      content: '确定要退出登录吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        await authStore.logout()
        router.push('/login')
      }
    })
  }
}

const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const editingId = ref<string | null>(null)
const searchKeyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

const users = ref<User[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  pageCount: 0,
  itemCount: 0
})

const genderMap: Record<number, string> = {
  0: '保密',
  1: '男',
  2: '女'
}

const roleOptions = [
  { label: '普通用户', value: '0' },
  { label: '红娘用户', value: '1' }
]

const statusOptions = [
  { label: '正常', value: '1' },
  { label: '禁用', value: '0' }
]

const columns = [
  { title: 'ID', key: 'id', width: 100 },
  { title: '邮箱', key: 'email' },
  { title: '用户名', key: 'name' },
  {
    title: '性别', key: 'gender',
    render: (row: User) => genderMap[row.gender] || '未知'
  },
  { title: '年龄', key: 'age' },
  {
    title: '角色', key: 'role',
    render: (row: User) => h(NTag, { type: row.role === 1 ? 'warning' : 'info' }, () => row.role === 1 ? '红娘用户' : '普通用户')
  },
  {
    title: '管理员', key: 'is_admin',
    render: (row: User) => h(NTag, { type: row.is_admin ? 'error' : 'default' }, () => row.is_admin ? '是' : '否')
  },
  {
    title: '状态', key: 'status',
    render: (row: User) => h(NTag, { type: row.status === 1 ? 'success' : 'error' }, () => row.status === 1 ? '正常' : '禁用')
  },
  {
    title: '在线状态', key: 'is_online',
    render: (row: User) => h(NTag, { type: row.is_online === 1 ? 'success' : 'default' }, () => row.is_online === 1 ? '在线' : '离线')
  },
  { title: '创建时间', key: 'created' },
  {
    title: '操作', key: 'actions', width: 200,
    render: (row: User) => h(NSpace, null, () => [
      h(NButton, { text: true, type: 'primary', onClick: () => editUser(row) }, () => '编辑'),
      h(NButton, {
        text: true,
        type: row.status === 1 ? 'error' : 'success',
        onClick: () => toggleStatus(row)
      }, () => row.status === 1 ? '禁用' : '启用'),
      h(NButton, { text: true, type: 'error', onClick: () => deleteUser(row) }, () => '删除')
    ])
  }
]

const form = reactive({
  email: '',
  name: '',
  password: '',
  gender: '0',
  role: '0',
  is_admin: false,
  age: '',
  bio: ''
})

// 动态表单验证规则（根据新增/编辑模式调整密码验证）
const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: '请输入邮箱', trigger: ['input', 'blur'] },
    {
      validator: (_rule: FormItemRule, value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return new Error('请输入有效的邮箱地址')
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ],
  name: [
    { required: true, message: '请输入用户名', trigger: ['input', 'blur'] }
  ],
  password: [
    {
      required: !editingId.value,
      message: '请输入密码',
      trigger: ['input', 'blur']
    },
    {
      validator: (_rule: FormItemRule, value: string) => {
        if (value && value.length < 8) {
          return new Error('密码长度至少为8位')
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: ['change'] }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: ['change'] }
  ],
  age: [
    {
      validator: (_rule: FormItemRule, value: string) => {
        if (value && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 150)) {
          return new Error('请输入有效的年龄')
        }
        return true
      },
      trigger: ['input', 'blur']
    }
  ]
}))

const buildFilter = () => {
  const filters: string[] = []
  if (searchKeyword.value) {
    filters.push(`(email ~ "${searchKeyword.value}" || name ~ "${searchKeyword.value}")`)
  }
  if (roleFilter.value) {
    filters.push(`role = ${roleFilter.value}`)
  }
  if (statusFilter.value) {
    filters.push(`status = ${statusFilter.value}`)
  }
  return filters.join(' && ')
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const filter = buildFilter()
    const result = await pb.collection('users').getList(
      pagination.page,
      pagination.pageSize,
      { filter, sort: '-created' }
    )
    users.value = result.items as unknown as User[]
    pagination.pageCount = result.totalPages
    pagination.itemCount = result.totalItems
  } catch (error: any) {
    message.error(error.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

const resetFilters = () => {
  searchKeyword.value = ''
  roleFilter.value = ''
  statusFilter.value = ''
  pagination.page = 1
  fetchUsers()
}

const handlePagination = (newPagination: typeof pagination) => {
  pagination.page = newPagination.page
  pagination.pageSize = newPagination.pageSize
  fetchUsers()
}

const editUser = async (user: User) => {
  editingId.value = user.id
  form.email = user.email
  form.name = user.name
  form.password = ''
  form.gender = String(user.gender)
  form.role = String(user.role)
  form.is_admin = user.is_admin || false
  form.age = user.age ? String(user.age) : ''
  form.bio = user.bio || ''
  showCreateModal.value = true
}

const toggleStatus = async (user: User) => {
  try {
    await pb.collection('users').update(user.id, { status: user.status === 1 ? 0 : 1 })
    message.success(user.status === 1 ? '用户已禁用' : '用户已启用')
    fetchUsers()
  } catch (error: any) {
    message.error(error.message || '操作失败')
  }
}

const deleteUser = (user: User) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除用户「${user.name || user.email}」吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await pb.collection('users').delete(user.id)
        message.success('删除成功')
        fetchUsers()
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    }
  })
}

const handleModalClose = () => {
  editingId.value = null
  form.email = ''
  form.name = ''
  form.password = ''
  form.gender = '0'
  form.role = '0'
  form.is_admin = false
  form.age = ''
  form.bio = ''
}

const submitForm = async () => {
  // 使用 Naive UI 表单验证
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 管理员保护：如果取消管理员身份，检查是否还有至少一个管理员
  if (editingId.value && !form.is_admin) {
    const adminCount = users.value.filter(u => u.is_admin).length
    const currentIsAdmin = users.value.find(u => u.id === editingId.value)?.is_admin
    if (currentIsAdmin && adminCount <= 1) {
      message.warning('不能取消最后一个管理员的管理员身份')
      return
    }
  }

  submitting.value = true
  try {
    if (editingId.value) {
      const updateData: Record<string, any> = {
        email: form.email.trim(),
        name: form.name,
        gender: parseInt(form.gender),
        role: parseInt(form.role),
        is_admin: form.is_admin
      }
      if (form.age) {
        updateData.age = parseInt(form.age)
      }
      if (form.bio) {
        updateData.bio = form.bio
      }
      if (form.password) {
        updateData.password = form.password
        updateData.passwordConfirm = form.password
      }
      await pb.collection('users').update(editingId.value, updateData)
      message.success('修改成功')
    } else {
      await pb.collection('users').create({
        email: form.email,
        name: form.name,
        password: form.password,
        passwordConfirm: form.password,
        gender: parseInt(form.gender),
        role: parseInt(form.role),
        is_admin: form.is_admin,
        emailVisibility: true,
        age: form.age ? parseInt(form.age) : null,
        bio: form.bio,
        status: 1,
        is_online: 0
      })
      await pb.collection('user_stats').create({
        user_id: (await pb.collection('users').getFirstListItem(`email="${form.email}"`)).id,
        login_count: 0,
        interaction_count: 0,
        popularity_score: 0
      })
      message.success('创建成功')
    }
    showCreateModal.value = false
    fetchUsers()
  } catch (error: any) {
    // 处理邮箱已存在的错误
    if (error.data?.data?.email?.code === 'validation_not_unique') {
      message.warning('该邮箱已被注册，请使用其他邮箱')
      return
    }
    // 显示字段级错误
    if (error.data?.data) {
      const fieldMap: Record<string, string> = {
        email: '邮箱', name: '用户名', password: '密码',
        gender: '性别', role: '角色', age: '年龄', bio: '个人简介'
      }
      const msgs = Object.entries(error.data.data).map(([f, e]: [string, any]) =>
        `${fieldMap[f] || f}: ${e.message}`
      )
      message.warning(msgs.join('; '))
      return
    }
    message.error(error.data?.message || error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
