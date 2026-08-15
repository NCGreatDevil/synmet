<template>
  <n-drawer
    v-model:show="showDrawer"
    :width="400"
    placement="right"
    :mask-closable="true"
  >
    <n-drawer-content title="消息中心" closable>
      <!-- 顶部应用栏 -->
      <div class="chat-panel-header">
        <n-button
          text
          @click="showNotificationPanel = true"
          class="notification-btn"
        >
          <n-badge :value="notificationUnreadCount" :max="99" :show="notificationUnreadCount > 0">
            <n-icon :size="20">
              <NotificationsOutline />
            </n-icon>
          </n-badge>
        </n-button>
      </div>

      <!-- 聊天列表 -->
      <div class="chat-list">
        <div
          v-for="group in groups"
          :key="group.id"
          class="chat-item"
          @click="handleChatClick(group.id)"
        >
          <!-- 群头像 -->
          <div class="chat-avatar">
            <n-avatar :size="48" round>
              {{ group.name.charAt(0) }}
            </n-avatar>
            <n-badge
              v-if="group.unreadCount > 0"
              :value="group.unreadCount"
              :max="99"
              class="unread-badge"
            />
          </div>

          <!-- 聊天信息 -->
          <div class="chat-info">
            <div class="chat-header">
              <span class="chat-name">{{ group.name }}</span>
              <span class="chat-time">{{ formatTime(group.lastMessage?.sendTime) }}</span>
            </div>
            <div class="chat-preview">
              {{ group.lastMessage?.content || '暂无消息' }}
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="groups.length === 0" class="empty-state">
          <n-empty description="暂无聊天" />
        </div>
      </div>
    </n-drawer-content>

    <!-- 通知中心面板（覆盖层） -->
    <NotificationPanel
      v-if="showNotificationPanel"
      :show="showNotificationPanel"
      @update:show="showNotificationPanel = $event"
    />
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NDrawer, NDrawerContent, NAvatar, NBadge, NButton, NIcon, NEmpty } from 'naive-ui'
import { NotificationsOutline } from '@vicons/ionicons5'
import { useChatStore } from '@/stores/chat'
import { useMatchmakingStore } from '@/stores/matchmaking'
import NotificationPanel from './NotificationPanel.vue'
import { formatRelativeTime } from '@/lib/format'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'openChat', groupId: string): void
}>()

const chatStore = useChatStore()
const matchmakingStore = useMatchmakingStore()

const showDrawer = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const showNotificationPanel = ref(false)

const groups = computed(() => chatStore.groups)

// 通知未读数
const notificationUnreadCount = computed(() => matchmakingStore.unreadCount)

// 组件挂载时加载群组列表
onMounted(() => {
  chatStore.loadUserGroups()
})

// 格式化时间
const formatTime = (date?: Date) => {
  if (!date) return ''
  return formatRelativeTime(date)
}

// 点击聊天项
const handleChatClick = (groupId: string) => {
  chatStore.openChat(groupId)
  emit('openChat', groupId)
  showDrawer.value = false
}
</script>

<style scoped>
.chat-panel-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.notification-btn {
  padding: 8px;
}

.chat-list {
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f5f5f5;
}

.chat-item:hover {
  background-color: #f5f5f5;
}

.chat-avatar {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chat-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  margin-left: 8px;
}

.chat-preview {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}
</style>
