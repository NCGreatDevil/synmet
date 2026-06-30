<template>
  <div class="header-bar">
    <!-- 左上角标题 -->
    <div class="header-left">
      <div class="banner-title">遇见广场</div>
    </div>

    <!-- 顶部居中跑马灯 -->
    <div class="header-center">
      <div class="marquee-wrapper">
        <NMarquee>
          <span class="marquee-text">🔥 今日新增 128 位用户在线</span>
        </NMarquee>
      </div>
    </div>

    <!-- 右上角用户头像 -->
    <div class="header-right">
      <NDropdown :options="menuOptions" @select="handleMenuSelect">
        <template #default>
          <NAvatar :size="48" :round="true" src="https://randomuser.me/api/portraits/men/10.jpg" class="user-avatar" />
        </template>
      </NDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NMarquee, NDropdown, NAvatar } from 'naive-ui'

const menuOptions = [
  { label: '我的', key: 'profile' },
  { label: '设置', key: 'settings' },
  { label: '帮助', key: 'help' },
  { label: '退出', key: 'logout' }
]

const emit = defineEmits<{
  menuSelect: [key: string]
}>()

const handleMenuSelect = (key: string) => {
  emit('menuSelect', key)
}
</script>

<style scoped>
.header-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  z-index: 10;
}

.header-left {
  flex-shrink: 0;
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
  display: flex;
  justify-content: center;
  padding: 0 60px;
}

.marquee-wrapper {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.header-right {
  flex-shrink: 0;
}

.user-avatar {
  cursor: pointer;
  border: 2px solid #079992;
}
</style>
