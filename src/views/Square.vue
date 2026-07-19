<template>
  <div class="social-map">
    <!-- 粒子背景 -->
    <ParticleBackground />

    <!-- 核心画布 -->
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.3"
      :max-zoom="1.5"
      :apply-default="false"
      :connection-mode="ConnectionMode.Loose"
      pan-on-drag
      zoom-on-scroll
      @node-click="handleNodeClick"
      @node-double-click="onNodeDoubleClick"
      @edge-click="handleEdgeClick"
      @connect="onConnect"
      @pane-click="handlePaneClick"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      fit-view
    >
    </VueFlow>

    <!-- 顶部导航栏 -->
    <HeaderBar @menu-select="handleMenuSelect" />

    <!-- 底部操作栏 -->
    <ActionBar :user-count="nodes.length" @refresh="refreshPage" />

    <!-- 用户详情抽屉 -->
    <UserDrawer
      v-model:show="showDrawer"
      :active-user="activeUser"
      @increase-popularity="increasePopularity"
      @decrease-popularity="decreasePopularity"
    />

    <!-- 个人资料编辑对话框 -->
    <ProfileEditDialog
      v-model:show="showProfileEdit"
      @saved="handleProfileSaved"
    />

    <!-- 牵线匹配面板（仅红娘角色可见） -->
    <MatchmakingPanel
      v-if="isMatchmaker"
      :show="showMatchPanel"
      :user-a="selectedEdge?.userA"
      :user-b="selectedEdge?.userB"
      :sending="sendingRequest"
      @close="handleClosePanel"
      @send-request="handleSendRequest"
      @cancel-match="handleCancelMatch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, computed } from 'vue'
import { VueFlow, ConnectionMode } from '@vue-flow/core'
import { useMessage } from 'naive-ui'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import ParticleBackground from '@/components/ParticleBackground.vue'
import UserNode from '@/components/UserNode.vue'
import HeaderBar from '@/components/HeaderBar.vue'
import ActionBar from '@/components/ActionBar.vue'
import UserDrawer from '@/components/UserDrawer.vue'
import ProfileEditDialog from '@/components/ProfileEditDialog.vue'
import MatchmakingPanel from '@/components/MatchmakingPanel.vue'
import { useGraph } from '@/composables/useGraph'
import { useAuthStore } from '@/stores/auth'
import { useMatchmakingStore } from '@/stores/matchmaking'


const message = useMessage()
const authStore = useAuthStore()
const matchmakingStore = useMatchmakingStore()

const {
  nodes,
  edges,
  activeUser,
  selectedEdge,
  onNodesChange,
  onEdgesChange,
  refreshPage,
  increasePopularity,
  decreasePopularity,
  clearAllActive,
  handleNodeClick,
  handleNodeDoubleClick,
  handleEdgeClick,
  handleConnect,
  cancelMatch,
  closeMatchPanel
} = useGraph()

const showDrawer = ref(false)
const showProfileEdit = ref(false)
const sendingRequest = ref(false)

// 判断当前用户是否为红娘角色（role=1）
const isMatchmaker = computed(() => Number(authStore.currentUser?.role) === 1)

// 匹配面板显示状态：有选中连线且当前用户是红娘
const showMatchPanel = computed(() => isMatchmaker.value && selectedEdge.value !== null)

const nodeTypes = {
  userNode: markRaw(UserNode) as any
}

const onNodeDoubleClick = (event: any) => {
  handleNodeDoubleClick(event)
  showDrawer.value = true
}

const onConnect = (params: any) => {
  try {
    handleConnect(params)
  } catch (error: any) {
    message.warning(error.message)
  }
}

const handlePaneClick = () => {
  clearAllActive()
  showDrawer.value = false
}

const handleMenuSelect = async (key: string) => {
  switch (key) {
    case 'profile':
      showProfileEdit.value = true
      break
    case 'settings':
      message.info('设置页面')
      break
    case 'help':
      message.info('帮助页面')
      break
    case 'logout':
      await authStore.logout()
      message.success('已退出登录')
      window.location.href = '/'
      break
  }
}

const handleProfileSaved = () => {
  message.success('个人资料已更新')
}

/** 关闭匹配面板（保留连线） */
const handleClosePanel = () => {
  closeMatchPanel()
}

/** 发送匹配请求：创建牵线申请并发送通知 */
const handleSendRequest = async () => {
  if (!selectedEdge.value) return
  sendingRequest.value = true
  try {
    const matchmakerId = authStore.currentUser?.id || ''
    const matchmakerName = authStore.currentUser?.username || authStore.currentUser?.name || '红娘'
    
    console.log('发送匹配请求:', {
      matchmakerId,
      matchmakerName,
      userA: selectedEdge.value.userA,
      userB: selectedEdge.value.userB
    })
    
    await matchmakingStore.sendMatchmakingInvite(
      matchmakerId,
      matchmakerName,
      selectedEdge.value.userA,
      selectedEdge.value.userB
    )

    console.log('匹配邀请已发送到数据库')
    
    message.success(`已向 ${selectedEdge.value.userA.name} 和 ${selectedEdge.value.userB.name} 发送匹配请求`)
    closeMatchPanel()
  } catch (error) {
    console.error('发送匹配请求失败:', error)
    message.error('发送匹配请求失败')
  } finally {
    sendingRequest.value = false
  }
}

/** 取消匹配：删除连线并隐藏面板 */
const handleCancelMatch = () => {
  cancelMatch()
  message.info('已取消匹配')
}
</script>

<style scoped>
.social-map {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
  position: relative;
}

:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__edge-path) {
  stroke: #b1b1b7;
  stroke-width: 1.5;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #ff4d6d;
  stroke-width: 3;
}
</style>
