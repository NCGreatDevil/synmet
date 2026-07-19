<template>
  <NCard
    v-if="show"
    class="matchmaking-panel"
    :bordered="false"
  >
    <template #header>
      <NFlex justify="space-between" align="center">
        <span class="panel-title">牵线匹配</span>
        <NButton quaternary circle size="small" @click="handleClose">
          <template #icon>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </template>
        </NButton>
      </NFlex>
    </template>

    <NFlex vertical :size="16" align="center">
      <!-- 两个用户信息 -->
      <NFlex justify="center" align="center" :size="24" class="users-container">
        <!-- 用户A -->
        <NFlex vertical align="center" :size="8" class="user-card">
          <NAvatar
            :size="64"
            round
            :src="userA?.avatar"
            class="user-avatar"
          />
          <span class="user-name">{{ userA?.name || '用户A' }}</span>
        </NFlex>

        <!-- 连接符号 -->
        <div class="connection-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <!-- 用户B -->
        <NFlex vertical align="center" :size="8" class="user-card">
          <NAvatar
            :size="64"
            round
            :src="userB?.avatar"
            class="user-avatar"
          />
          <span class="user-name">{{ userB?.name || '用户B' }}</span>
        </NFlex>
      </NFlex>

      <!-- 操作按钮 -->
      <NFlex :size="12" class="action-buttons">
        <NButton type="primary" @click="handleSendRequest" :loading="sending">
          发送匹配请求
        </NButton>
        <NButton type="error" @click="handleCancelMatch">
          取消匹配
        </NButton>
      </NFlex>
    </NFlex>
  </NCard>
</template>

<script setup lang="ts">
import { NCard, NFlex, NAvatar, NButton } from 'naive-ui'

export interface MatchUser {
  id: string
  name: string
  avatar: string
}

defineProps<{
  show: boolean
  userA: MatchUser | null
  userB: MatchUser | null
  sending: boolean
}>()

const emit = defineEmits<{
  close: []
  sendRequest: []
  cancelMatch: []
}>()

const handleClose = () => {
  emit('close')
}

const handleSendRequest = () => {
  emit('sendRequest')
}

const handleCancelMatch = () => {
  emit('cancelMatch')
}
</script>

<style scoped>
.matchmaking-panel {
  position: absolute;
  top: 80px;
  right: 24px;
  width: 320px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.users-container {
  padding: 8px 0;
}

.user-card {
  min-width: 80px;
}

.user-avatar {
  border: 3px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-name {
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.connection-icon {
  color: #f43f5e;
  padding: 0 4px;
}

.action-buttons {
  width: 100%;
  justify-content: center;
  padding-top: 8px;
}
</style>
