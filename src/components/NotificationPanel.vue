<template>
  <n-drawer
    v-model:show="showDrawer"
    :width="400"
    placement="right"
    :mask-closable="true"
  >
    <n-drawer-content title="通知中心" closable>
      <!-- Tab 切换 -->
      <n-tabs v-model:value="activeTab" type="segment" animated>
        <n-tab-pane name="inbox" tab="收件箱">
          <div v-if="inboxNotifications.length === 0" class="empty-state">
            <n-empty description="暂无通知" />
          </div>

          <n-list v-else hoverable clickable>
            <n-list-item
              v-for="notification in inboxNotifications"
              :key="notification.id"
              @click="handleNotificationClick(notification)"
              :class="{ unread: !notification.isRead }"
            >
              <div class="notification-item">
                <div class="notification-header">
                  <n-tag :type="getNotificationType(notification.type)" size="small">
                    {{ getNotificationTitle(notification.type) }}
                  </n-tag>
                  <span class="notification-time">
                    {{ formatTime(notification.createdAt) }}
                  </span>
                </div>

                <div class="notification-content">
                  <div class="notification-title">
                    {{ notification.title }}
                  </div>
                  <div class="notification-message">
                    {{ notification.content }}
                  </div>
                  <div class="notification-link">
                    <a @click.stop="handleOpenInvitationManagement">点击进入列表</a>
                  </div>
                </div>

                <div v-if="!notification.isRead" class="unread-indicator"></div>
              </div>
            </n-list-item>
          </n-list>
        </n-tab-pane>

        <n-tab-pane name="sent" tab="发件箱">
          <div v-if="sentNotifications.length === 0" class="empty-state">
            <n-empty description="暂无发送记录" />
          </div>

          <n-list v-else hoverable clickable>
            <n-list-item
              v-for="notification in sentNotifications"
              :key="notification.id"
              @click="handleNotificationClick(notification)"
              :class="{ unread: !notification.isRead }"
            >
              <div class="notification-item">
                <div class="notification-header">
                  <n-tag :type="getNotificationType(notification.type)" size="small">
                    {{ getNotificationTitle(notification.type) }}
                  </n-tag>
                  <span class="notification-time">
                    {{ formatTime(notification.createdAt) }}
                  </span>
                </div>

                <div class="notification-content">
                  <div class="notification-title">
                    {{ notification.title }}
                  </div>
                  <div class="notification-message">
                    {{ notification.content }}
                  </div>
                  <div class="notification-link">
                    <a @click.stop="handleOpenInvitationManagement">点击进入列表</a>
                  </div>
                </div>

                <div v-if="!notification.isRead" class="unread-indicator"></div>
              </div>
            </n-list-item>
          </n-list>
        </n-tab-pane>
      </n-tabs>

      <!-- 通知详情弹窗 -->
      <n-modal
        v-model:show="showDetailModal"
        preset="card"
        :title="selectedNotification?.title"
        style="width: 500px;"
      >
        <div v-if="selectedNotification" class="notification-detail">
          <div class="detail-row">
            <span class="detail-label">{{ activeTab === 'inbox' ? '发件人：' : '收件人：' }}</span>
            <span class="detail-value">{{ activeTab === 'inbox' ? selectedNotification.senderName : selectedNotification.userId }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ activeTab === 'inbox' ? '接收时间：' : '发送时间：' }}</span>
            <span class="detail-value">{{ formatTime(selectedNotification.createdAt) }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">内容：</span>
            <div class="detail-content">{{ selectedNotification.content }}</div>
          </div>

          <div class="detail-actions">
            <n-button @click="showDetailModal = false">
              确定
            </n-button>
            <n-button type="primary" @click="handleOpenInvitationManagement">
              点击进入列表
            </n-button>
          </div>
        </div>
      </n-modal>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NTabs,
  NTabPane,
  NDrawer,
  NDrawerContent,
  NList,
  NListItem,
  NTag,
  NEmpty,
  NModal,
  NButton
} from 'naive-ui'
import { useMatchmakingStore, type Notification } from '@/stores/matchmaking'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'openInvitationManagement'): void
}>()

const matchmakingStore = useMatchmakingStore()
const authStore = useAuthStore()

// 使用 storeToRefs 确保响应式
const { notifications: allNotifications } = storeToRefs(matchmakingStore)

const showDrawer = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const activeTab = ref<'inbox' | 'sent'>('inbox')
const showDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)

// 获取当前用户ID
const currentUserId = computed(() => authStore.currentUser?.id || '')

// 收件箱：当前用户收到的通知
const inboxNotifications = computed(() => {
  return allNotifications.value.filter(n => n.userId === currentUserId.value)
})

// 发件箱：当前用户发出的通知（去重：相同 relatedApplicationId + userId 只保留一条）
const sentNotifications = computed(() => {
  const sent = allNotifications.value.filter(n => n.senderId === currentUserId.value)
  // 去重：同一个牵线申请发给同一个收件人只保留一条
  const seen = new Set<string>()
  return sent.filter(n => {
    const key = `${n.relatedApplicationId}_${n.userId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const handleNotificationClick = (notification: Notification) => {
  selectedNotification.value = notification
  showDetailModal.value = true

  // 标记为已读
  if (!notification.isRead) {
    matchmakingStore.markAsRead(notification.id)
  }
}

const handleOpenInvitationManagement = () => {
  showDetailModal.value = false
  showDrawer.value = false
  emit('openInvitationManagement')
}

const getNotificationType = (type: string) => {
  switch (type) {
    case 'matchmaking_invite':
      return 'info'
    case 'matchmaking_accepted':
      return 'success'
    case 'matchmaking_rejected':
      return 'error'
    default:
      return 'default'
  }
}

const getNotificationTitle = (type: string) => {
  switch (type) {
    case 'matchmaking_invite':
      return '牵线邀请'
    case 'matchmaking_accepted':
      return '邀请已接受'
    case 'matchmaking_rejected':
      return '邀请已拒绝'
    default:
      return '通知'
  }
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.notification-item {
  position: relative;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #f0f9ff;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.notification-content {
  margin-left: 4px;
}

.notification-title {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.notification-link {
  margin-top: 8px;
}

.notification-link a {
  font-size: 12px;
  color: #18a0fb;
  cursor: pointer;
  text-decoration: none;
}

.notification-link a:hover {
  text-decoration: underline;
}

.unread-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #18a058;
}

.notification-detail {
  padding: 16px 0;
}

.detail-row {
  margin-bottom: 16px;
}

.detail-label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
}

.detail-value {
  color: #333;
}

.detail-content {
  margin-top: 8px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 6px;
  line-height: 1.6;
  color: #333;
}

.detail-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
</style>
