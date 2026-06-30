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
      :is-editing="isEditing"
      :available-tags="availableTags"
      @increase-popularity="increasePopularity"
      @decrease-popularity="decreasePopularity"
      @save-edit="handleSaveEdit"
      @cancel-edit="cancelEdit"
      @toggle-tag="handleToggleTag"
      @start-editing="startEditing"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { VueFlow, ConnectionMode } from '@vue-flow/core'
import { useMessage } from 'naive-ui'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import ParticleBackground from '@/components/ParticleBackground.vue'
import UserNode from '@/components/UserNode.vue'
import HeaderBar from '@/components/HeaderBar.vue'
import ActionBar from '@/components/ActionBar.vue'
import UserDrawer from '@/components/UserDrawer.vue'
import { useGraph } from '@/composables/useGraph'


const message = useMessage()

const {
  nodes,
  edges,
  activeUser,
  isEditing,
  availableTags,
  onNodesChange,
  onEdgesChange,
  refreshPage,
  toggleTag,
  startEditing,
  increasePopularity,
  decreasePopularity,
  saveEdit,
  cancelEdit,
  clearAllActive,
  handleNodeClick,
  handleNodeDoubleClick,
  handleEdgeClick,
  handleConnect
} = useGraph()

const showDrawer = ref(false)

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

const handleMenuSelect = (key: string) => {
  switch (key) {
    case 'profile':
      message.info('我的页面')
      break
    case 'settings':
      message.info('设置页面')
      break
    case 'help':
      message.info('帮助页面')
      break
    case 'logout':
      message.info('退出登录')
      break
  }
}

const handleToggleTag = (tag: string) => {
  const success = toggleTag(tag)
  if (!success) {
    message.warning('最多选择3个标签')
  }
}

const handleSaveEdit = () => {
  const success = saveEdit()
  if (success) {
    message.success('保存成功')
  }
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
