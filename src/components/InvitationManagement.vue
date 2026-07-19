<template>
  <n-drawer
    v-model:show="showDrawer"
    :width="600"
    placement="right"
    :mask-closable="true"
  >
    <n-drawer-content title="邀请管理" closable>
      <div v-if="applications.length === 0" class="empty-state">
        <n-empty description="暂无邀请" />
      </div>

      <n-list v-else hoverable>
        <n-list-item
          v-for="app in applications"
          :key="app.id"
        >
          <div class="invitation-item">
            <div class="invitation-header">
              <div class="invitation-date">
                {{ formatDate(app.applyTime) }}
              </div>
              <div class="matchmaker-name">
                红娘：{{ app.matchmakerName }}
              </div>
            </div>

            <div class="invitation-content">
              <!-- 用户A -->
              <div class="user-card" @click.stop="handleUserClick(app.userA)">
                <n-avatar
                  :size="48"
                  round
                  :src="app.userA.avatar"
                  :class="{
                    'avatar-gray': app.userA.status === 'pending'
                  }"
                />
                <div
                  class="user-name"
                  :class="{
                    'status-gray': app.userA.status === 'pending',
                    'status-normal': app.userA.status === 'accepted' || app.userA.status === 'rejected'
                  }"
                >
                  {{ app.userA.name }}
                </div>
              </div>

              <!-- 连线状态 -->
              <div class="connection-line">
                <div
                  class="line"
                  :class="{
                    'line-confirmed': app.applicationStatus === 'confirmed',
                    'line-rejected': app.applicationStatus === 'rejected'
                  }"
                ></div>
                <div class="status-badge">
                  <n-tag :type="getStatusType(app.applicationStatus)" size="small">
                    {{ getStatusText(app.applicationStatus) }}
                  </n-tag>
                </div>
              </div>

              <!-- 用户B -->
              <div class="user-card" @click.stop="handleUserClick(app.userB)">
                <n-avatar
                  :size="48"
                  round
                  :src="app.userB.avatar"
                  :class="{
                    'avatar-gray': app.userB.status === 'pending'
                  }"
                />
                <div
                  class="user-name"
                  :class="{
                    'status-gray': app.userB.status === 'pending',
                    'status-normal': app.userB.status === 'accepted' || app.userB.status === 'rejected'
                  }"
                >
                  {{ app.userB.name }}
                </div>
              </div>
            </div>

            <!-- 操作按钮（仅被邀请用户且状态为待确认时显示） -->
            <div v-if="canOperate(app)" class="invitation-actions">
              <n-button
                type="success"
                size="small"
                @click="handleAccept(app.id)"
              >
                接受邀请
              </n-button>
              <n-button
                type="error"
                size="small"
                @click="handleReject(app.id)"
              >
                拒绝邀请
              </n-button>
            </div>

            <div v-else class="invitation-status">
              <n-tag :type="getStatusType(app.applicationStatus)" size="small">
                {{ getStatusText(app.applicationStatus) }}
              </n-tag>
            </div>
          </div>
        </n-list-item>
      </n-list>

      <!-- 用户信息弹窗 -->
      <n-modal
        v-model:show="showUserModal"
        preset="card"
        :title="selectedUser?.name"
        style="width: 450px;"
      >
        <div v-if="selectedUser" class="user-info-modal">
          <div class="user-avatar-large">
            <n-avatar
              :size="120"
              round
              :src="selectedUser.avatar"
            />
          </div>

          <div class="user-details">
            <div class="detail-row">
              <span class="detail-label">姓名：</span>
              <span class="detail-value">{{ selectedUser.name }}</span>
            </div>

            <div v-if="selectedUser.gender !== undefined" class="detail-row">
              <span class="detail-label">性别：</span>
              <span class="detail-value">{{ getGenderText(selectedUser.gender) }}</span>
            </div>

            <div v-if="selectedUser.age" class="detail-row">
              <span class="detail-label">年龄：</span>
              <span class="detail-value">{{ selectedUser.age }}岁</span>
            </div>

            <div v-if="selectedUser.bio" class="detail-row">
              <span class="detail-label">个人简介：</span>
              <p class="detail-value bio-text">{{ selectedUser.bio }}</p>
            </div>

            <div v-if="selectedUser.tags && selectedUser.tags.length > 0" class="detail-row">
              <span class="detail-label">标签：</span>
              <div class="detail-tags">
                <n-tag
                  v-for="tag in selectedUser.tags"
                  :key="tag"
                  type="info"
                  size="small"
                  round
                >
                  {{ tag }}
                </n-tag>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <n-button @click="showUserModal = false">
              关闭
            </n-button>
          </div>
        </div>
      </n-modal>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NList,
  NListItem,
  NAvatar,
  NTag,
  NButton,
  NEmpty,
  NModal,
  useMessage
} from 'naive-ui'
import { useMatchmakingStore, type MatchApplication } from '@/stores/matchmaking'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const message = useMessage()
const matchmakingStore = useMatchmakingStore()
const authStore = useAuthStore()

const showDrawer = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const showUserModal = ref(false)
const selectedUser = ref<any>(null)

// 判断当前用户是否为红娘
const isMatchmaker = computed(() => Number(authStore.currentUser?.role) === 1)
const currentUserId = computed(() => authStore.currentUser?.id || '')
const currentUserName = computed(() => authStore.currentUser?.username || authStore.currentUser?.name || '')

// 监听面板打开，加载数据
watch(() => props.show, async (newShow) => {
  if (newShow && currentUserId.value) {
    await matchmakingStore.loadUserApplications(currentUserId.value, isMatchmaker.value)
  }
})

// 获取当前用户相关的邀请列表
const applications = computed(() => {
  return matchmakingStore.getUserApplications(currentUserId.value, isMatchmaker.value)
})

// 判断当前用户是否可以操作（接受/拒绝）
// 红娘无操作按钮，只有被邀请的用户可以操作
const canOperate = (app: MatchApplication) => {
  // 红娘不能操作
  if (isMatchmaker.value) return false

  // 只有被邀请的用户可以操作，且申请状态为待确认
  if (app.applicationStatus !== 'pending') return false

  const isUserA = app.userA.id === currentUserId.value
  const isUserB = app.userB.id === currentUserId.value

  // 如果当前用户是A，且A还未确认，可以操作
  if (isUserA && app.userA.status === 'pending') return true
  // 如果当前用户是B，且B还未确认，可以操作
  if (isUserB && app.userB.status === 'pending') return true

  return false
}

const handleUserClick = (user: any) => {
  selectedUser.value = user
  showUserModal.value = true
}

const handleAccept = async (applicationId: string) => {
  try {
    await matchmakingStore.acceptInvitation(applicationId, currentUserId.value, currentUserName.value)
    message.success('已接受邀请')
    // 重新加载数据
    await matchmakingStore.loadUserApplications(currentUserId.value, isMatchmaker.value)
  } catch (error) {
    console.error('接受邀请失败:', error)
    message.error('接受邀请失败')
  }
}

const handleReject = async (applicationId: string) => {
  try {
    await matchmakingStore.rejectInvitation(applicationId, currentUserId.value, currentUserName.value)
    message.success('已拒绝邀请')
    // 重新加载数据
    await matchmakingStore.loadUserApplications(currentUserId.value, isMatchmaker.value)
  } catch (error) {
    console.error('拒绝邀请失败:', error)
    message.error('拒绝邀请失败')
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '待确认'
    case 'confirmed':
      return '已确认'
    case 'rejected':
      return '已拒绝'
    default:
      return '未知'
  }
}

const getGenderText = (gender: number) => {
  switch (gender) {
    case 1:
      return '男'
    case 2:
      return '女'
    default:
      return '未知'
  }
}
</script>

<style scoped>
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.invitation-item {
  padding: 16px;
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.invitation-date {
  font-size: 12px;
  color: #999;
}

.matchmaker-name {
  font-size: 12px;
  color: #18a0fb;
  font-weight: 500;
}

.invitation-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.user-card:hover {
  transform: scale(1.05);
}

.user-name {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* 灰色状态（待确认） */
.avatar-gray {
  filter: grayscale(100%);
  opacity: 0.5;
}

.status-gray {
  color: #999;
}

/* 正常色彩（已接受或已拒绝） */
.status-normal {
  color: #333;
  font-weight: 600;
}

.connection-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 0 16px;
}

.line {
  width: 100%;
  height: 3px;
  background-color: #d9d9d9;
  border-radius: 2px;
  margin-bottom: 8px;
}

.line.line-confirmed {
  background-color: #18a058;
}

.line.line-rejected {
  background-color: #d03050;
}

.status-badge {
  margin-top: 4px;
}

.invitation-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.invitation-status {
  display: flex;
  justify-content: center;
}

.user-info-modal {
  padding: 16px 0;
}

.user-avatar-large {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.user-details {
  margin-bottom: 24px;
}

.detail-row {
  margin-bottom: 12px;
}

.detail-label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
  min-width: 80px;
  display: inline-block;
}

.detail-value {
  color: #333;
  flex: 1;
}

.bio-text {
  margin: 0;
  line-height: 1.6;
  color: #666;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
