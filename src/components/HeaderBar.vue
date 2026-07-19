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

    <!-- 右侧：通知 + 用户信息 -->
    <NFlex :size="12" align="center" :wrap="false" shrink="0">
      <NButton quaternary circle class="notification-btn" @click="showNotificationPanel = true">
        <template #icon>
          <NBadge :value="unreadCount" :max="99" :offset="[-2, 2]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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

    <!-- 通知面板 -->
    <NotificationPanel 
      v-model:show="showNotificationPanel" 
      @openInvitationManagement="handleOpenInvitationManagement"
    />

    <!-- 邀请管理 -->
    <InvitationManagement v-model:show="showInvitationManagement" />
  </NFlex>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NFlex, NMarquee, NDropdown, NAvatar, NButton, NBadge } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useMatchmakingStore } from '@/stores/matchmaking'
import { getUserAvatarUrl } from '@/lib/pocketbase'
import NotificationPanel from './NotificationPanel.vue'
import InvitationManagement from './InvitationManagement.vue'

const authStore = useAuthStore()
const matchmakingStore = useMatchmakingStore()
const { currentUser } = storeToRefs(authStore)

// 通知未读数（从 matchmaking store 获取）
const unreadCount = computed(() => matchmakingStore.unreadCount)

// 面板显示状态
const showNotificationPanel = ref(false)
const showInvitationManagement = ref(false)

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
