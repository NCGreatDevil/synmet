<template>
  <div :class="['user-node', `status-${status}`, { 'node-active': selected }]">
    <Handle :id="`${id}-top`" type="source" :position="Position.Top" class="connect-handle" />
    <Handle :id="`${id}-bottom`" type="source" :position="Position.Bottom" class="connect-handle" />
    <Handle :id="`${id}-left`" type="source" :position="Position.Left" class="connect-handle" />
    <Handle :id="`${id}-right`" type="source" :position="Position.Right" class="connect-handle" />
    <div class="avatar-container">
      <div class="avatar-wrapper">
        <img :src="data.avatar" class="avatar" @error="handleAvatarError" />
      </div>
      <div class="status-pulse"></div>
    </div>
    <div class="name">{{ data.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { UserData } from '@/types'

const props = defineProps<{
  data: UserData
  id: string
  selected?: boolean
}>()

const status = computed(() => props.data.status || 'offline')

/** 头像加载失败时隐藏图片 */
const handleAvatarError = (e: Event) => {
  const target = e.target as HTMLImageElement
  target.style.display = 'none'
}
</script>

<style scoped>
.user-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
}

.user-node:hover {
  transform: scale(1.05);
}

.user-node.node-active {
  box-shadow: 0 0 20px rgba(255, 77, 109, 0.4);
}

.avatar-container {
  position: relative;
  width: 56px;
  height: 56px;
  margin-bottom: 8px;
}

.avatar-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid transparent;
}

.user-node.status-active .avatar-wrapper {
  border-color: #10b981;
}

.user-node.status-online .avatar-wrapper {
  border-color: #6ee7b7;
}

.user-node.status-offline .avatar-wrapper {
  border-color: #ffffff;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-pulse {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  border-radius: 50%;
}

.user-node.status-active .status-pulse {
  animation: pulse-active 4s ease-in-out infinite;
}

.user-node.status-online .status-pulse {
  animation: none;
}

.user-node.status-offline .status-pulse {
  animation: none;
}

@keyframes pulse-active {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(16, 185, 129, 0);
  }
}

.name {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}

.connect-handle {
  width: 14px;
  height: 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.user-node:hover .connect-handle {
  opacity: 1;
}

.connect-handle:hover {
  background: #fff;
  border-color: #60a5fa;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
}
</style>
