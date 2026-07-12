<template>
  <NDrawer :show="show" @update:show="$emit('update:show', $event)" :width="360" placement="right">
    <NDrawerContent :title="activeUser?.data.name" closable>
      <div class="drawer-content">
        <div :class="['avatar-container', `status-${activeUser?.data.status || 'offline'}`]">
          <div class="avatar-wrapper">
            <NAvatar :size="80" round :src="getAvatarUrl()" class="drawer-avatar" />
          </div>
          <div class="status-pulse"></div>
        </div>

        <div class="info-section">
          <div class="info-item">
            <span class="info-label">状态：</span>
            <NTag :type="getStatusType(activeUser?.data.status)" round>
              {{ getStatusText(activeUser?.data.status) }}
            </NTag>
          </div>
          <div class="info-item">
            <span class="info-label">用户名：</span>
            <span class="info-value">{{ activeUser?.data.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">个人介绍：</span>
            <p class="info-value bio-text">{{ activeUser?.data.bio || '暂无介绍' }}</p>
          </div>
          <div class="info-item">
            <span class="info-label">标签：</span>
            <NSpace class="drawer-tags">
              <NTag v-for="tag in activeUser?.data.tags" :key="tag" type="info" round size="small">
                {{ tag }}
              </NTag>
              <span v-if="!activeUser?.data.tags?.length" class="no-tags">暂无标签</span>
            </NSpace>
          </div>
          <div class="info-item">
            <span class="info-label">人气：</span>
            <span class="info-value">{{ activeUser?.data.popularity || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">累计互动：</span>
            <span class="info-value">{{ activeUser?.data.interaction || 0 }}</span>
          </div>
          <NSpace class="popularity-buttons" fill>
            <NButton color="#e55039" @click="handleIncreasePopularity">
              <template #icon><CaretUpSharp /></template>
              增加人气
            </NButton>
            <NButton color="#4a69bd" @click="handleDecreasePopularity">
              <template #icon><CaretDownSharp /></template>
              减少人气
            </NButton>
          </NSpace>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NAvatar, NTag, NSpace, NButton } from 'naive-ui'
import { CaretUpSharp, CaretDownSharp } from '@vicons/ionicons5'
import type { Node } from '@vue-flow/core'
import type { UserStatus } from '@/types'
import { getDefaultAvatar } from '@/lib/pocketbase'

const props = defineProps<{
  show: boolean
  activeUser: Node | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  increasePopularity: []
  decreasePopularity: []
}>()

const getStatusType = (status?: UserStatus) => {
  switch (status) {
    case 'active': return 'success'
    case 'online': return 'info'
    default: return 'default'
  }
}

const getStatusText = (status?: UserStatus) => {
  switch (status) {
    case 'active': return '活跃'
    case 'online': return '在线'
    default: return '离线'
  }
}

const handleIncreasePopularity = () => {
  emit('increasePopularity')
}

const handleDecreasePopularity = () => {
  emit('decreasePopularity')
}

const getAvatarUrl = () => {
  if (!props.activeUser) return getDefaultAvatar(0)
  const data = props.activeUser.data as any
  // data.avatar 已经是完整 URL（由 useGraph.ts 中的 getUserAvatarUrl 生成）
  return data.avatar || getDefaultAvatar(data.gender || 0)
}
</script>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.avatar-container {
  position: relative;
  width: 86px;
  height: 86px;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
}

.status-active .avatar-wrapper {
  border-color: #10b981;
}

.status-online .avatar-wrapper {
  border-color: #6ee7b7;
}

.status-offline .avatar-wrapper {
  border-color: #e5e7eb;
}

.drawer-avatar {
  border-radius: 50%;
  background-color: #fff !important;
}

.status-pulse {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
}

.status-active .status-pulse {
  animation: pulse-active 4s ease-in-out infinite;
}

@keyframes pulse-active {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(16, 185, 129, 0);
  }
}

.info-section {
  width: 100%;
}

.info-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.info-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.info-value {
  font-size: 14px;
  color: #374151;
}

.bio-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

.drawer-tags {
  flex-wrap: wrap;
}

.no-tags {
  font-size: 12px;
  color: #9ca3af;
}

.popularity-buttons {
  margin-top: 8px;
  margin-bottom: 16px;
}
</style>
