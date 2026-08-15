<template>
  <NFlex
    justify="space-between"
    align="center"
    class="header-bar"
  >
    <!-- 左侧：标题 -->
    <NFlex :size="12" align="center" :wrap="false" shrink="0">
      <span class="banner-title">遇见广场</span>
    </NFlex>

    <!-- 中间：跑马灯 -->
    <NFlex
      justify="center"
      align="center"
      class="header-center"
    >
      <div class="marquee-wrapper">
        <NMarquee>
          <span class="marquee-text">🔥 今日新增 128 位用户在线</span>
        </NMarquee>
      </div>
    </NFlex>

    <!-- 右侧：消息中心 + 用户信息 -->
    <NFlex :size="12" align="center" :wrap="false" shrink="0">
      <NButton quaternary circle class="notification-btn" @click="showChatPanel = true">
        <template #icon>
          <NBadge :value="totalUnreadCount" :max="99" :offset="[-2, 2]">
            <svg viewBox="0 0 1024 1024" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
              <path d="M1022.588147 511.294073c0-282.916054-228.378019-511.294073-511.294074-511.294073S0 228.378019 0 511.294073s228.378019 511.294073 511.294073 511.294074c20.451763 0 44.312153-3.408627 64.763916-3.408628 34.086272 3.408627 74.989797 6.817254 115.893324 3.408628 132.936459-3.408627 228.378019-34.086272 286.324681-57.946662-37.494899-6.817254-92.032933-20.451763-153.388222-47.72078C944.189722 821.479144 1022.588147 674.908177 1022.588147 511.294073zM255.647037 426.078394c0-37.494899 30.677644-68.172543 68.172543-68.172543s68.172543 30.677644 68.172543 68.172543-30.677644 68.172543-68.172543 68.172544-68.172543-30.677644-68.172543-68.172544zM756.715229 681.725431c-44.312153 85.215679-129.527832 136.345086-228.37802 136.345086-95.44156 0-180.657239-51.129407-224.969392-136.345086-3.408627-6.817254 0-17.043136 6.817254-23.86039 6.817254-3.408627 17.043136 0 23.86039 6.817254 37.494899 71.58117 112.484696 119.30195 197.700375 119.301951 81.807052 0 156.796849-44.312153 197.700375-119.301951 3.408627-6.817254 13.634509-10.225881 23.86039-6.817254 3.408627 3.408627 6.817254 13.634509 3.408628 23.86039z m10.225881-177.248612l-190.883121-47.72078c-3.408627 0-3.408627-3.408627-6.817254-3.408627 0 0 0-3.408627-3.408627-3.408627v-3.408628-6.817254c0-6.817254 3.408627-10.225881 6.817254-13.634509L749.897974 330.636834c6.817254-3.408627 13.634509 0 17.043136 10.225882s0 17.043136-6.817254 23.86039l-136.345087 71.58117 146.570968 37.494899c6.817254 3.408627 13.634509 10.225881 10.225882 20.451763 0 6.817254-6.817254 13.634509-13.634509 10.225881z"/>
            </svg>
          </NBadge>
        </template>
      </NButton>

      <NDropdown :options="menuOptions" @select="handleMenuSelect">
        <template #default>
          <NFlex :size="8" align="center" :wrap="false" class="user-info">
            <NAvatar
              :size="36"
              :round="true"
              :src="getUserAvatarUrl(currentUser)"
              class="user-avatar"
            />
            <span class="user-name">{{ currentUser?.username || currentUser?.name || '用户' }}</span>
          </NFlex>
        </template>
      </NDropdown>
    </NFlex>

    <!-- 消息中心面板（聊天列表） -->
    <ChatPanel
      v-model:show="showChatPanel"
      @openChat="handleOpenChat"
    />

    <!-- 聊天窗口 -->
    <ChatWindow
      v-model:show="showChatWindow"
    />

    <!-- 通知面板（从 ChatPanel 内部触发） -->
    <NotificationPanel 
      v-model:show="showNotificationPanel" 
      @openInvitationManagement="handleOpenInvitationManagement"
    />

    <!-- 邀请管理 -->
    <InvitationManagement v-model:show="showInvitationManagement" />
  </NFlex>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NFlex, NMarquee, NDropdown, NAvatar, NButton, NBadge } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useMatchmakingStore } from '@/stores/matchmaking'
import { useChatStore } from '@/stores/chat'
import { getUserAvatarUrl } from '@/lib/pocketbase'
import ChatPanel from './ChatPanel.vue'
import ChatWindow from './ChatWindow.vue'
import NotificationPanel from './NotificationPanel.vue'
import InvitationManagement from './InvitationManagement.vue'

const authStore = useAuthStore()
const matchmakingStore = useMatchmakingStore()
const chatStore = useChatStore()
const { currentUser } = storeToRefs(authStore)

// 总未读数（聊天 + 通知）
const totalUnreadCount = computed(() => {
  return chatStore.totalUnreadCount + matchmakingStore.unreadCount
})

// 面板显示状态
const showChatPanel = ref(false)
const showChatWindow = ref(false)
const showNotificationPanel = ref(false)
const showInvitationManagement = ref(false)

// 轮询定时器
let pollTimer: ReturnType<typeof setInterval> | null = null

// 页面加载时自动拉取通知，并设置 1 分钟轮询
onMounted(async () => {
  const userId = authStore.currentUser?.id
  if (userId) {
    await matchmakingStore.loadInboxNotifications(userId)
  }
  // 每 1 分钟轮询一次新通知
  pollTimer = setInterval(async () => {
    const uid = authStore.currentUser?.id
    if (uid) {
      await matchmakingStore.loadInboxNotifications(uid)
    }
  }, 60 * 1000)
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

const menuOptions = [
  { label: '我的', key: 'profile' },
  { label: '邀请管理', key: 'invitations' },
  { label: '设置', key: 'settings' },
  { label: '帮助', key: 'help' },
  { label: '退出', key: 'logout' }
]

const emit = defineEmits<{
  menuSelect: [key: string]
}>()

const handleMenuSelect = (key: string) => {
  if (key === 'invitations') {
    showInvitationManagement.value = true
    return
  }
  emit('menuSelect', key)
}

const handleOpenChat = (_groupId: string) => {
  showChatWindow.value = true
}

const handleOpenInvitationManagement = () => {
  showInvitationManagement.value = true
}
</script>

<style scoped>
.header-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  z-index: 10;
}

.banner-title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.header-center {
  flex: 1;
  padding: 0 60px;
}

.marquee-wrapper {
  height: 40px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  max-width: 500px;
}

.marquee-text {
  font-size: 14px;
  color: #4b5563;
}

.notification-btn {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(8px);
}

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
}

.user-info {
  cursor: pointer;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  transition: background 0.2s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.25);
}

.user-avatar {
  border: 2px solid #fff;
}

.user-name {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
