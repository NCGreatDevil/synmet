<template>
  <div class="action-bar">
    <!-- 左下角操作区 -->
    <div class="action-left">
      <NButton
        type="primary"
        circle
        size="large"
        @click="handleRefresh"
        class="refresh-btn"
      >
        <Refresh class="w-5 h-5" />
      </NButton>
      <NTooltip trigger="hover" placement="top">
        <template #trigger>
          <div class="user-count">
            {{ userCount }}
          </div>
        </template>
        在线人数
      </NTooltip>
    </div>

    <!-- 右下角操作提示 -->
    <NTooltip trigger="hover" placement="top">
      <template #trigger>
        <div class="corner-hint">
          👋 点击头像查看详情 · 🔗 拖拽头像可建立连接
        </div>
      </template>
      操作提示
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
import { NButton, NTooltip } from 'naive-ui'
import { Refresh } from '@vicons/ionicons5'

defineProps<{
  userCount: number
}>()

const emit = defineEmits<{
  refresh: []
}>()

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style scoped>
.action-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  z-index: 10;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.user-count {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  overflow: hidden;
}

.corner-hint {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 12px;
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
