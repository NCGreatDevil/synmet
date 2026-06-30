<template>
  <div class="social-map" :class="{ dark: isDarkMode }">
    <!-- 粒子背景画布 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 左上角搜索框 -->
    <div class="search-box">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索用户..."
        @focus="showSearchDropdown = true"
        @input="handleSearch"
      />
      <div v-if="showSearchDropdown && filteredUsers.length" class="search-dropdown">
        <div 
          v-for="user in filteredUsers" 
          :key="user.id"
          class="search-item"
          @click="locateUser(user.id)"
        >
          <img :src="user.avatar" class="search-avatar" />
          <span>{{ user.name }}</span>
          <span class="search-status" :class="{ online: user.online }"></span>
        </div>
      </div>
    </div>

    <!-- 右上角主题切换 -->
    <div class="theme-toggle" @click="toggleDarkMode">
      {{ isDarkMode ? '☀️' : '🌙' }}
    </div>

    <!-- 新增：多选批量操作浮动栏 -->
    <div v-if="selectedNodeIds.length > 1" class="batch-toolbar">
      <span class="batch-count">已选 {{ selectedNodeIds.length }} 人</span>
      <div class="batch-actions">
        <div class="batch-submenu-trigger">
          <span>📂 移动到分组</span>
          <div class="batch-submenu">
            <div 
              v-for="g in groups" 
              :key="g.id"
              class="batch-subitem"
              @click="batchMoveToGroup(g.id)"
            >
              <span class="submenu-dot" :style="{ backgroundColor: g.color }"></span>
              {{ g.name }}
            </div>
          </div>
        </div>
        <span class="batch-btn" @click="batchUpgradeIntimacy">⬆️ 升级亲密度</span>
        <span class="batch-btn danger" @click="batchRemoveNodes">🗑️ 批量删除</span>
        <span class="batch-btn" @click="clearSelection">✕ 取消</span>
      </div>
    </div>

    <!-- 核心画布 -->
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.3"
      :max-zoom="2"
      pan-on-drag
      zoom-on-scroll
      :zoom-on-pinch="true"
      :prevent-scrolling="true"
      :nodes-draggable="true"
      @node-click="handleNodeClick"
      @node-dblclick="handleNodeDoubleClick"
      @node-contextmenu="handleNodeContextMenu"
      @node-drag-start="onNodeDragStart"
      @node-drag="onNodeDrag"
      @node-drag-end="onNodeDragEnd"
      @edge-click="handleEdgeClick"
      @connect="handleConnect"
      @pane-click="handlePaneClick"
      @pane-mousedown="onPaneMouseDown"
      @pane-mousemove="onPaneMouseMove"
      @pane-mouseup="onPaneMouseUp"
      @viewport-change="onViewportChange"
      :node-types="nodeTypes"
      :class="{ 'dark-flow': isDarkMode }"
    >
      
      <!-- 新增：连线标签 -->
      <div v-for="edge in visibleEdges" :key="'label-'+edge.id" class="edge-label" :style="getEdgeLabelStyle(edge)">
        <span class="edge-label-text" :class="'intimacy-'+edge.data?.intimacy">
          {{ ['', '认识', '好友', '密友'][edge.data?.intimacy || 1] }}
        </span>
      </div>

      <!-- 框选遮罩 -->
      <div v-if="isSelecting && selectionBox" class="selection-box" :style="selectionBoxStyle"></div>
    </VueFlow>

    <!-- 迷你小地图 -->
    <div class="minimap-wrap">
      <canvas ref="minimapCanvas" class="minimap-canvas" @click="handleMinimapClick"></canvas>
    </div>

    <!-- 连线标签显隐开关 -->
    <div class="label-toggle" @click="showEdgeLabels = !showEdgeLabels">
      {{ showEdgeLabels ? '🏷️ 隐藏标签' : '🏷️ 显示标签' }}
    </div>

    <!-- 顶部悬浮滚动公告 -->
    <div class="float-banner">
      <div class="banner-scroll">
        🔥 今日新增 128 位用户在线 · ⌨️ 按住 Shift 多选节点 · 🏷️ 连线显示关系等级
      </div>
    </div>

    <!-- 左右滑动用户详情弹窗 -->
    <div v-if="showModal" class="user-modal" @click.self="closeModal">
      <div 
        class="card-wrapper"
        :style="{ transform: `translateX(${ -currentIndex * 100 + slideOffset }%)` }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div 
          v-for="(user) in userList" 
          :key="user.id"
          class="modal-card"
        >
          <div class="modal-handle"></div>
          <div class="modal-avatar-wrap">
            <img :src="user.avatar" class="modal-avatar" alt="avatar" />
            <span class="modal-status" :class="{ online: user.online }"></span>
          </div>
          <h3>{{ user.name }}</h3>
          <p class="modal-status-text">{{ user.online ? '在线' : '离线' }}</p>
          <p class="modal-desc">{{ user.bio }}</p>
          
          <div class="relation-info" v-if="getRelationWithCurrent(user.id)">
            <span class="relation-tag" :class="`intimacy-${getRelationWithCurrent(user.id)}`">
              {{ ['', '普通认识', '好友', '密友'][getRelationWithCurrent(user.id)] }}
            </span>
          </div>

          <div class="modal-tags">
            <span v-for="tag in user.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <button class="close-btn" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 移动端长按节点底部操作菜单 -->
    <div v-if="showActionSheet" class="action-sheet-mask" @click.self="closeActionSheet">
      <div class="action-sheet">
        <div class="action-sheet-header">
          <div class="action-avatar-wrap">
            <img :src="currentActionNode?.data?.avatar" class="action-avatar" />
            <span class="action-status" :class="{ online: currentActionNode?.data?.online }"></span>
          </div>
          <div class="action-user-info">
            <span class="action-name">{{ currentActionNode?.data?.name }}</span>
            <span class="action-status-text">{{ currentActionNode?.data?.online ? '在线' : '离线' }}</span>
          </div>
        </div>
        <div class="action-list">
          <div class="action-item" @click="viewDetail">
            <span>👤</span> 查看详情
          </div>
          <div class="action-item" @click="zoomToNode">
            <span>🔍</span> 放大查看
          </div>
          <div class="action-item" @click="upgradeIntimacyFromSheet" v-if="isConnectedWithCurrent">
            <span>⬆️</span> 升级亲密度
          </div>
          <div class="action-item" @click="toggleConnection" v-if="!isConnectedWithCurrent">
            <span>➕</span> 建立好友连接
          </div>
          <div class="action-item danger" @click="toggleConnection" v-else>
            <span>➖</span> 解除好友关系
          </div>
        </div>
        <div class="action-cancel" @click="closeActionSheet">取消</div>
      </div>
    </div>

    <!-- 桌面端右键上下文菜单 -->
    <div 
      v-if="showContextMenu" 
      class="context-menu"
      :style="{ top: contextMenuPos.y + 'px', left: contextMenuPos.x + 'px' }"
    >
      <div class="context-item" @click="viewDetailFromContext">
        <span>👤</span> 查看详情
      </div>
      <div class="context-item" @click="zoomToNodeFromContext">
        <span>🔍</span> 放大查看
      </div>
      <div class="context-item" @click="upgradeIntimacyFromContext" v-if="isContextConnected">
        <span>⬆️</span> 升级亲密度
      </div>
      <div class="context-item" @click="toggleConnectionFromContext" v-if="!isContextConnected">
        <span>➕</span> 建立好友连接
      </div>
      <div class="context-item danger" @click="toggleConnectionFromContext" v-else>
        <span>➖</span> 解除好友关系
      </div>
      <div class="context-item context-submenu-trigger">
        <span>📂</span> 移动到分组
        <div class="context-submenu">
          <div 
            v-for="g in groups" 
            :key="g.id"
            class="context-subitem"
            @click.stop="moveNodeToGroup(currentContextNode!.id, g.id)"
          >
            <span class="submenu-dot" :style="{ backgroundColor: g.color }"></span>
            {{ g.name }}
          </div>
        </div>
      </div>
      <div class="context-divider"></div>
      <div class="context-item danger" @click="removeNode">
        <span>🗑️</span> 移除节点
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, h, defineComponent, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import {
  VueFlow, addEdge, Handle, Position, useVueFlow,
  type Connection, type Edge, type Node, type ViewportTransform
} from '@vue-flow/core'
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const { fitView, setCenter, zoomTo, getTransform } = useVueFlow()
let simulation: ReturnType<typeof forceSimulation> | null = null
let longPressTimer: number | null = null
let lastTapTime = 0
let particleAnimationId: number | null = null
let minimapAnimationId: number | null = null

// ========== 暗黑模式状态 ==========
const isDarkMode = ref(false)
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
}

// ========== 粒子动效参数配置 ==========
const particleConfig = {
  desktopCount: 80,
  mobileCount: 40,
  baseSpeed: 0.5,
  gravityRange: 120,
  gravityStrength: 0.02,
  linkDistance: 120,
  minSize: 1,
  maxSize: 3,
  velocityDecay: 0.99
}

// ========== 粒子背景相关 ==========
const particleCanvas = ref<HTMLCanvasElement | null>(null)
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}
let particles: Particle[] = []
let mousePos = { x: -1000, y: -1000 }

const initParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const isMobile = window.innerWidth < 768
  const count = isMobile ? particleConfig.mobileCount : particleConfig.desktopCount
  particles = []

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * particleConfig.baseSpeed,
      vy: (Math.random() - 0.5) * particleConfig.baseSpeed,
      size: Math.random() * (particleConfig.maxSize - particleConfig.minSize) + particleConfig.minSize
    })
  }
}

const animateParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = window.innerWidth
  const height = window.innerHeight
  ctx.clearRect(0, 0, width, height)

  const particleColor = isDarkMode.value ? 'rgba(148, 163, 184, 0.6)' : 'rgba(59, 130, 246, 0.5)'
  const lineColor = isDarkMode.value ? 'rgba(148, 163, 184, 0.15)' : 'rgba(59, 130, 246, 0.12)'

  particles.forEach(p => {
    const dx = mousePos.x - p.x
    const dy = mousePos.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < particleConfig.gravityRange) {
      const force = (particleConfig.gravityRange - dist) / particleConfig.gravityRange * particleConfig.gravityStrength
      p.vx += dx / dist * force
      p.vy += dy / dist * force
    }

    p.x += p.vx
    p.y += p.vy

    if (p.x < 0 || p.x > width) p.vx *= -1
    if (p.y < 0 || p.y > height) p.vy *= -1

    p.vx *= particleConfig.velocityDecay
    p.vy *= particleConfig.velocityDecay

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = particleColor
    ctx.fill()
  })

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < particleConfig.linkDistance) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  particleAnimationId = requestAnimationFrame(animateParticles)
}

const handleMouseMove = (e: MouseEvent) => {
  mousePos.x = e.clientX
  mousePos.y = e.clientY
}
const handleResize = () => {
  initParticles()
}

// ========== 分组数据 ==========
const groups = ref([
  { id: 'g1', name: '密友圈', x: 80, y: 80, width: 320, height: 280, color: '#ec4899', collapsed: false },
  { id: 'g2', name: '好友列表', x: 450, y: 100, width: 320, height: 280, color: '#3b82f6', collapsed: false },
  { id: 'g3', name: '新认识', x: 260, y: 400, width: 320, height: 260, color: '#64748b', collapsed: false }
])

// ========== 网格排列配置 ==========
const gridConfig = {
  padding: 20,
  gapX: 20,
  gapY: 30,
  nodeWidth: 80,
  nodeHeight: 90
}

// ========== 拖拽吸附配置 ==========
const snapThreshold = 30
const activeSnapGroup = ref<string | null>(null)

// ========== 新增：多选状态 ==========
const selectedNodeIds = ref<string[]>([])
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionBox = ref<{ x: number; y: number; width: number; height: number } | null>(null)

const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {}
  return {
    left: selectionBox.value.x + 'px',
    top: selectionBox.value.y + 'px',
    width: selectionBox.value.width + 'px',
    height: selectionBox.value.height + 'px'
  }
})

const clearSelection = () => {
  selectedNodeIds.value = []
  nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
}

// ========== 新增：连线标签显隐 ==========
const showEdgeLabels = ref(true)
const visibleEdges = computed(() => edges.value.filter(e => !e.hidden && showEdgeLabels.value))

// 计算连线标签位置
const getEdgeLabelStyle = (edge: Edge) => {
  const sourceNode = nodes.value.find(n => n.id === edge.source)
  const targetNode = nodes.value.find(n => n.id === edge.target)
  if (!sourceNode || !targetNode) return { display: 'none' }

  const sx = sourceNode.position.x + 40
  const sy = sourceNode.position.y + 40
  const tx = targetNode.position.x + 40
  const ty = targetNode.position.y + 40

  const midX = (sx + tx) / 2
  const midY = (sy + ty) / 2

  const transform = getTransform()
  const screenX = midX * transform.zoom + transform.x
  const screenY = midY * transform.zoom + transform.y

  return {
    left: screenX + 'px',
    top: screenY + 'px',
    transform: 'translate(-50%, -50%)'
  }
}

// ========== 自定义节点组件 ==========
const GroupNode = defineComponent({
  props: ['data'],
  emits: ['toggle-collapse', 'arrange-group'],
  setup(props, { emit }) {
    return () => h('div', {
      class: ['group-node', { collapsed: props.data.collapsed, 'snap-active': props.data.id === activeSnapGroup.value }],
      style: {
        borderColor: props.data.color,
        background: `${props.data.color}10`
      }
    }, [
      h('div', { class: 'group-header' }, [
        h('span', { class: 'group-title', style: { color: props.data.color } }, props.data.name),
        h('div', { class: 'group-actions' }, [
          h('span', { 
            class: 'header-btn',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('arrange-group', props.data.id)
            }
          }, '排列'),
          h('span', { 
            class: 'header-btn',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('toggle-collapse', props.data.id)
            }
          }, props.data.collapsed ? '展开' : '折叠')
        ])
      ])
    ])
  }
})

const UserNode = defineComponent({
  props: ['data', 'selected'],
  setup(props, { emit }) {
    let startX = 0
    let startY = 0
    let hasMoved = false

    const handleTouchStart = (e: TouchEvent) => {
      hasMoved = false
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      
      const currentTime = Date.now()
      if (currentTime - lastTapTime < 300) {
        emit('double-click')
      }
      lastTapTime = currentTime

      longPressTimer = window.setTimeout(() => {
        if (!hasMoved) {
          emit('long-press')
        }
      }, 500)
    }

    const handleTouchMove = (e: TouchEvent) => {
      const diffX = Math.abs(e.touches[0].clientX - startX)
      const diffY = Math.abs(e.touches[0].clientY - startY)
      if (diffX > 5 || diffY > 5) {
        hasMoved = true
        if (longPressTimer) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }
    }

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    return () => h('div', {
      class: [
        'user-node',
        { 'node-active': props.selected },
        { 'node-enter': props.data.isNew }
      ],
      onTouchstart: handleTouchStart,
      onTouchmove: handleTouchMove,
      onTouchend: handleTouchEnd
    }, [
      h(Handle, { type: 'source', position: Position.Top, class: 'connect-handle' }),
      h('div', { class: 'avatar-wrap' }, [
        h('img', { src: props.data.avatar, class: 'avatar' }),
        h('span', { 
          class: ['status-dot', { online: props.data.online }]
        })
      ]),
      h('div', { class: 'name' }, props.data.name),
      h(Handle, { type: 'target', position: Position.Bottom, class: 'connect-handle' })
    ])
  }
})

// ========== 基础用户数据 ==========
const userList = ref([
  { id: '1', name: '小明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', bio: '热爱旅行和摄影', tags: ['旅行', '摄影'], online: true, groupId: 'g1' },
  { id: '2', name: '小红', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2', bio: '产品经理，咖啡爱好者', tags: ['产品', '咖啡'], online: true, groupId: 'g1' },
  { id: '3', name: '阿杰', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3', bio: '全栈开发者', tags: ['开发', '开源'], online: false, groupId: 'g2' },
  { id: '4', name: '莉莉', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4', bio: 'UI 设计师', tags: ['设计', '插画'], online: true, groupId: 'g2' },
  { id: '5', name: '大伟', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5', bio: '运营总监', tags: ['运营', '增长'], online: false, groupId: 'g3' },
  { id: '6', name: '晓晓', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6', bio: '数据分析师', tags: ['数据', '分析'], online: true, groupId: 'g3' }
])

// 初始化节点
const nodes = ref<any[]>([
  ...groups.value.map(g => ({
    id: g.id,
    type: 'groupNode',
    position: { x: g.x, y: g.y },
    data: g,
    draggable: true,
    selectable: false
  })),
  ...userList.value.map((user) => ({
    id: user.id,
    type: 'userNode',
    position: { x: Math.random() * 200 + 100, y: Math.random() * 150 + 100 },
    data: { ...user, isNew: false },
    selected: false,
    hidden: false
  }))
])

// ========== 带亲密度的连线数据 ==========
const edges = ref<any[]>([
  { id: 'e1-2', source: '1', target: '2', data: { intimacy: 3 }, className: 'intimacy-3', hidden: false },
  { id: 'e1-3', source: '1', target: '3', data: { intimacy: 2 }, className: 'intimacy-2', hidden: false },
  { id: 'e2-4', source: '2', target: '4', data: { intimacy: 1 }, className: 'intimacy-1', hidden: false },
  { id: 'e3-5', source: '3', target: '5', data: { intimacy: 2 }, className: 'intimacy-2', hidden: false },
  { id: 'e4-6', source: '4', target: '6', data: { intimacy: 3 }, className: 'intimacy-3', hidden: false }
])

const nodeTypes: any = {
  userNode: markRaw(UserNode),
  groupNode: markRaw(GroupNode)
}

// ========== 小地图相关 ==========
const minimapCanvas = ref<HTMLCanvasElement | null>(null)
const currentViewport = ref<ViewportTransform>({ x: 0, y: 0, zoom: 1 })
const minimapSize = { width: 200, height: 140 }

const onViewportChange = (viewport: ViewportTransform) => {
  currentViewport.value = viewport
}

const drawMinimap = () => {
  const canvas = minimapCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = minimapSize.width * dpr
  canvas.height = minimapSize.height * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, minimapSize.width, minimapSize.height)

  const visibleNodes = nodes.value.filter(n => !n.hidden)
  if (visibleNodes.length === 0) return

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  visibleNodes.forEach(n => {
    const w = n.type === 'groupNode' ? n.data.width : 80
    const h = n.type === 'groupNode' ? n.data.height : 80
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  })

  const padding = 40
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const worldWidth = maxX - minX
  const worldHeight = maxY - minY
  const scale = Math.min(minimapSize.width / worldWidth, minimapSize.height / worldHeight)

  const toMinimapX = (x: number) => (x - minX) * scale
  const toMinimapY = (y: number) => (y - minY) * scale

  ctx.fillStyle = isDarkMode.value ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)'
  ctx.fillRect(0, 0, minimapSize.width, minimapSize.height)

  visibleNodes.filter(n => n.type === 'groupNode').forEach(g => {
    const x = toMinimapX(g.position.x)
    const y = toMinimapY(g.position.y)
    const w = g.data.width * scale
    const h = g.data.height * scale
    ctx.fillStyle = g.data.color + '20'
    ctx.strokeStyle = g.data.color
    ctx.lineWidth = 1
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
  })

  edges.value.filter(e => !e.hidden).forEach(e => {
    const source = visibleNodes.find(n => n.id === e.source)
    const target = visibleNodes.find(n => n.id === e.target)
    if (!source || !target) return

    ctx.beginPath()
    ctx.moveTo(toMinimapX(source.position.x + 40), toMinimapY(source.position.y + 40))
    ctx.lineTo(toMinimapX(target.position.x + 40), toMinimapY(target.position.y + 40))
    ctx.strokeStyle = isDarkMode.value ? 'rgba(100, 116, 139, 0.5)' : 'rgba(148, 163, 184, 0.5)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  })

  visibleNodes.filter(n => n.type === 'userNode').forEach(n => {
    const x = toMinimapX(n.position.x + 40)
    const y = toMinimapY(n.position.y + 40)
    ctx.beginPath()
    ctx.arc(x, y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = n.selected
      ? '#f43f5e'
      : (n.data.online 
        ? (isDarkMode.value ? '#4ade80' : '#22c55e')
        : (isDarkMode.value ? '#6b7280' : '#9ca3af'))
    ctx.fill()
  })

  const vp = currentViewport.value
  const canvasRect = document.querySelector('.vue-flow')?.getBoundingClientRect()
  if (canvasRect) {
    const viewportW = canvasRect.width / vp.zoom
    const viewportH = canvasRect.height / vp.zoom
    const viewportX = -vp.x / vp.zoom
    const viewportY = -vp.y / vp.zoom

    const mx = toMinimapX(viewportX)
    const my = toMinimapY(viewportY)
    const mw = viewportW * scale
    const mh = viewportH * scale

    ctx.strokeStyle = isDarkMode.value ? '#60a5fa' : '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.strokeRect(mx, my, mw, mh)
    ctx.fillStyle = isDarkMode.value ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)'
    ctx.fillRect(mx, my, mw, mh)
  }

  minimapAnimationId = requestAnimationFrame(drawMinimap)
}

const handleMinimapClick = (e: MouseEvent) => {
  const canvas = minimapCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  const visibleNodes = nodes.value.filter(n => !n.hidden)
  if (visibleNodes.length === 0) return

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  visibleNodes.forEach(n => {
    const w = n.type === 'groupNode' ? n.data.width : 80
    const h = n.type === 'groupNode' ? n.data.height : 80
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  })
  const padding = 40
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const worldWidth = maxX - minX
  const worldHeight = maxY - minY
  const scale = Math.min(minimapSize.width / worldWidth, minimapSize.height / worldHeight)

  const worldX = clickX / scale + minX
  const worldY = clickY / scale + minY

  setCenter(worldX, worldY, { duration: 300 })
}

// ========== 弹窗滑动相关状态 ==========
const showModal = ref(false)
const currentIndex = ref(0)
const slideOffset = ref(0)
let startX = 0
let isDragging = false

// ========== 搜索相关状态 ==========
const searchKeyword = ref('')
const showSearchDropdown = ref(false)
const filteredUsers = computed(() => {
  if (!searchKeyword.value) return []
  const keyword = searchKeyword.value.toLowerCase()
  return userList.value.filter(u => u.name.toLowerCase().includes(keyword))
})

// ========== 长按操作菜单状态 ==========
const showActionSheet = ref(false)
const currentActionNode = ref<Node | null>(null)
const isConnectedWithCurrent = computed(() => {
  if (!currentActionNode.value) return false
  const targetId = currentActionNode.value.id
  return edges.value.some(e => 
    (e.source === '1' && e.target === targetId) ||
    (e.source === targetId && e.target === '1')
  )
})

// ========== 右键菜单状态 ==========
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const currentContextNode = ref<Node | null>(null)
const isContextConnected = computed(() => {
  if (!currentContextNode.value) return false
  const targetId = currentContextNode.value.id
  return edges.value.some(e => 
    (e.source === '1' && e.target === targetId) ||
    (e.source === targetId && e.target === '1')
  )
})

// ========== 亲密度配置 ==========
const intimacyMaxLevel = 3

// ========== 分组折叠/展开核心逻辑 ==========
const toggleGroupCollapse = (groupId: string) => {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return

  group.collapsed = !group.collapsed

  const groupNode = nodes.value.find(n => n.id === groupId)
  if (groupNode) {
    groupNode.data = { ...group }
  }

  const groupUserIds = userList.value.filter(u => u.groupId === groupId).map(u => u.id)
  nodes.value = nodes.value.map(n => {
    if (groupUserIds.includes(n.id)) {
      return { ...n, hidden: group.collapsed }
    }
    return n
  })

  edges.value = edges.value.map(e => {
    const bothInGroup = groupUserIds.includes(e.source) && groupUserIds.includes(e.target)
    return { ...e, hidden: group.collapsed && bothInGroup }
  })

  restartForce()
}

// ========== 分组内节点网格自动排列 ==========
const arrangeGroupNodes = (groupId: string) => {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return

  if (group.collapsed) {
    toggleGroupCollapse(groupId)
    setTimeout(() => arrangeGroupNodes(groupId), 350)
    return
  }

  const groupUserIds = userList.value.filter(u => u.groupId === groupId).map(u => u.id)
  const groupNodes = nodes.value.filter(n => groupUserIds.includes(n.id) && !n.hidden)
  if (groupNodes.length === 0) return

  const { padding, gapX, gapY, nodeWidth, nodeHeight } = gridConfig
  
  const availableWidth = group.width - padding * 2
  const cols = Math.max(1, Math.floor((availableWidth + gapX) / (nodeWidth + gapX)))
  // const rows = Math.ceil(groupNodes.length / cols) // reserved for future use

  const totalWidth = cols * nodeWidth + (cols - 1) * gapX
  const startX = group.x + padding + (availableWidth - totalWidth) / 2
  const startY = group.y + padding + 40

  groupNodes.forEach((node, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const targetX = startX + col * (nodeWidth + gapX)
    const targetY = startY + row * (nodeHeight + gapY)

    node.position.x = targetX
    node.position.y = targetY

    if (simulation) {
      const forceNode = simulation.nodes().find((n: any) => n.id === node.id)
      if (forceNode) {
        forceNode.x = targetX
        forceNode.y = targetY
        forceNode.fx = targetX
        forceNode.fy = targetY
      }
    }
  })

  if (simulation) {
    simulation.alpha(0.1).restart()
    
    setTimeout(() => {
      groupNodes.forEach(node => {
        const forceNode = simulation?.nodes().find((n: any) => n.id === node.id)
        if (forceNode) {
          forceNode.fx = null
          forceNode.fy = null
        }
      })
    }, 500)
  }
}

// ========== 移动节点到指定分组 ==========
const moveNodeToGroup = (nodeId: string, groupId: string) => {
  const user = userList.value.find(u => u.id === nodeId)
  const targetGroup = groups.value.find(g => g.id === groupId)
  if (!user || !targetGroup) return

  user.groupId = groupId

  if (targetGroup.collapsed) {
    toggleGroupCollapse(groupId)
  }

  const node = nodes.value.find(n => n.id === nodeId)
  if (node) {
    node.position.x = targetGroup.x + gridConfig.padding + 20
    node.position.y = targetGroup.y + gridConfig.padding + 50

    if (simulation) {
      const forceNode = simulation.nodes().find((n: any) => n.id === nodeId)
      if (forceNode) {
        forceNode.x = node.position.x
        forceNode.y = node.position.y
        forceNode.fx = null
        forceNode.fy = null
      }
    }
  }

  restartForce()
  closeContextMenu()
}

// ========== 新增：批量操作方法 ==========
const batchMoveToGroup = (groupId: string) => {
  const targetGroup = groups.value.find(g => g.id === groupId)
  if (!targetGroup) return

  if (targetGroup.collapsed) {
    toggleGroupCollapse(groupId)
  }

  selectedNodeIds.value.forEach((nodeId, index) => {
    const user = userList.value.find(u => u.id === nodeId)
    if (user) user.groupId = groupId

    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
      const col = index % 3
      const row = Math.floor(index / 3)
      node.position.x = targetGroup.x + gridConfig.padding + 20 + col * 90
      node.position.y = targetGroup.y + gridConfig.padding + 50 + row * 100

      if (simulation) {
        const forceNode = simulation.nodes().find((n: any) => n.id === nodeId)
        if (forceNode) {
          forceNode.x = node.position.x
          forceNode.y = node.position.y
        }
      }
    }
  })

  restartForce()
  clearSelection()
}

const batchUpgradeIntimacy = () => {
  selectedNodeIds.value.forEach(targetId => {
    upgradeIntimacy(targetId)
  })
}

const batchRemoveNodes = () => {
  const ids = new Set(selectedNodeIds.value)
  
  nodes.value = nodes.value.filter(n => !ids.has(n.id))
  edges.value = edges.value.filter(e => !ids.has(e.source) && !ids.has(e.target))
  userList.value = userList.value.filter(u => !ids.has(u.id))
  
  clearSelection()
  restartForce()
}

// ========== 框选逻辑 ==========
const onPaneMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  if (!(e as any).shiftKey) {
    clearSelection()
    return
  }

  isSelecting.value = true
  const rect = (e.target as HTMLElement).closest('.vue-flow')?.getBoundingClientRect()
  if (!rect) return
  
  selectionStart.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  selectionBox.value = {
    x: selectionStart.value.x,
    y: selectionStart.value.y,
    width: 0,
    height: 0
  }
}

const onPaneMouseMove = (e: MouseEvent) => {
  if (!isSelecting.value || !selectionBox.value) return
  
  const rect = (e.target as HTMLElement).closest('.vue-flow')?.getBoundingClientRect()
  if (!rect) return

  const currentX = e.clientX - rect.left
  const currentY = e.clientY - rect.top

  const x = Math.min(selectionStart.value.x, currentX)
  const y = Math.min(selectionStart.value.y, currentY)
  const width = Math.abs(currentX - selectionStart.value.x)
  const height = Math.abs(currentY - selectionStart.value.y)

  selectionBox.value = { x, y, width, height }
}

const onPaneMouseUp = () => {
  if (!isSelecting.value || !selectionBox.value) {
    isSelecting.value = false
    return
  }

  // 计算选框在世界坐标中的范围
  const transform = getTransform()
  const box = selectionBox.value

  const worldLeft = (box.x - transform.x) / transform.zoom
  const worldRight = (box.x + box.width - transform.x) / transform.zoom
  const worldTop = (box.y - transform.y) / transform.zoom
  const worldBottom = (box.y + box.height - transform.y) / transform.zoom

  // 选中范围内的用户节点
  const selectedIds: string[] = []
  nodes.value.forEach(n => {
    if (n.type !== 'userNode' || n.hidden) return
    const nx = n.position.x + 40
    const ny = n.position.y + 40
    if (nx >= worldLeft && nx <= worldRight && ny >= worldTop && ny <= worldBottom) {
      selectedIds.push(n.id)
    }
  })

  selectedNodeIds.value = selectedIds
  nodes.value = nodes.value.map(n => ({
    ...n,
    selected: selectedIds.includes(n.id)
  }))

  isSelecting.value = false
  selectionBox.value = null
}

// ========== 批量导入用户数据 ==========
interface UserInput {
  id: string
  name: string
  avatar: string
  bio?: string
  tags?: string[]
  online?: boolean
  groupId?: string
}

const addUsersBatch = (userListInput: UserInput[]) => {
  const newUsers = userListInput.map(u => ({
    bio: '',
    tags: [],
    online: true,
    groupId: 'g3',
    ...u
  }))

  userList.value.push(...newUsers)

  const newNodes: Node[] = newUsers.map((user, index) => ({
    id: user.id,
    type: 'userNode',
    position: {
      x: 300 + (index % 4) * 30 + Math.random() * 20,
      y: 450 + Math.floor(index / 4) * 30 + Math.random() * 20
    },
    data: { ...user, isNew: true },
    selected: false,
    hidden: false
  }))

  nodes.value.push(...newNodes)
  restartForce()

  setTimeout(() => {
    newNodes.forEach(node => {
      const target = nodes.value.find(n => n.id === node.id)
      if (target) {
        target.data.isNew = false
      }
    })
  }, 600)
}

// ========== 力导向布局核心逻辑 ==========
const initForceLayout = () => {
  const visibleUserNodes = nodes.value.filter(n => n.type === 'userNode' && !n.hidden)
  const forceNodes = visibleUserNodes.map(n => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y
  }))
  const visibleEdges = edges.value.filter(e => !e.hidden)
  const forceLinks = visibleEdges.map(e => ({
    source: e.source,
    target: e.target
  }))

  const sim = forceSimulation(forceNodes as any)
    .force('charge', forceManyBody().strength(-280))
    .force('link', forceLink(forceLinks as any).id((d: any) => d.id).distance(120))
    .force('center', forceCenter(500, 350))
    .alphaDecay(0.02)
    .on('tick', () => {
      nodes.value = nodes.value.map(node => {
        if (node.type !== 'userNode') return node
        const forceNode = forceNodes.find(fn => fn.id === node.id)
        return forceNode
          ? { ...node, position: { x: forceNode.x, y: forceNode.y } }
          : node
      })
    })

  sim.on('end', () => {
    fitView({ padding: 0.15 })
  })
  
  simulation = sim as any
}

const restartForce = () => {
  if (!simulation) return
  const visibleUserNodes = nodes.value.filter(n => n.type === 'userNode' && !n.hidden)
  const forceNodes = visibleUserNodes.map(n => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y
  }))
  const visibleEdges = edges.value.filter(e => !e.hidden)
  const forceLinks = visibleEdges.map(e => ({
    source: e.source,
    target: e.target
  }))

  simulation.nodes(forceNodes)
  simulation.force('link', forceLink(forceLinks).id((d: any) => d.id).distance(120))
  simulation.alpha(0.3).restart()
}

// ========== 节点拖拽逻辑 ==========
const onNodeDragStart = (nodeDragEvent: any) => {
  const node = nodeDragEvent.node
  if (node.type === 'groupNode') return
  if (!simulation) return
  const forceNode = simulation.nodes().find((n: any) => n.id === node.id)
  if (forceNode) {
    forceNode.fx = node.position.x
    forceNode.fy = node.position.y
  }
  simulation.alpha(0.3).restart()
}

const onNodeDrag = (nodeDragEvent: any) => {
  const node = nodeDragEvent.node
  if (node.type === 'groupNode') return
  if (!simulation) return

  let snapped = false
  let snapGroupId: string | null = null

  for (const g of groups.value) {
    if (g.collapsed) continue

    const nodeCenterX = node.position.x + 40
    const nodeCenterY = node.position.y + 40
    const gLeft = g.x
    const gRight = g.x + g.width
    const gTop = g.y
    const gBottom = g.y + g.height

    const nearLeft = Math.abs(nodeCenterX - gLeft) < snapThreshold
    const nearRight = Math.abs(nodeCenterX - gRight) < snapThreshold
    const nearTop = Math.abs(nodeCenterY - gTop) < snapThreshold
    const nearBottom = Math.abs(nodeCenterY - gBottom) < snapThreshold
    const insideX = nodeCenterX > gLeft && nodeCenterX < gRight
    const insideY = nodeCenterY > gTop && nodeCenterY < gBottom

    if ((nearLeft || nearRight || nearTop || nearBottom) && (insideX || insideY)) {
      snapped = true
      snapGroupId = g.id

      let snapX = node.position.x
      let snapY = node.position.y

      if (nearLeft) snapX = gLeft + 20
      if (nearRight) snapX = gRight - 100
      if (nearTop) snapY = gTop + 50
      if (nearBottom) snapY = gBottom - 100

      const forceNode = simulation.nodes().find((n: any) => n.id === node.id)
      if (forceNode) {
        forceNode.fx = snapX
        forceNode.fy = snapY
      }
      break
    }
  }

  activeSnapGroup.value = snapGroupId

  if (!snapped) {
    const forceNode = simulation.nodes().find((n: any) => n.id === node.id)
    if (forceNode) {
      forceNode.fx = node.position.x
      forceNode.fy = node.position.y
    }
  }
}

const onNodeDragEnd = (nodeDragEvent: any) => {
  const node = nodeDragEvent.node
  if (node.type === 'groupNode') {
    const group = groups.value.find(g => g.id === node.id)
    if (group) {
      group.x = node.position.x
      group.y = node.position.y
    }
    return
  }

  if (!simulation) return
  
  activeSnapGroup.value = null

  const { x, y } = node.position
  let belongGroup: string | null = null
  
  for (const g of groups.value) {
    if (g.collapsed) continue
    if (x > g.x && x < g.x + g.width && y > g.y && y < g.y + g.height) {
      belongGroup = g.id
      break
    }
  }

  if (belongGroup) {
    const user = userList.value.find(u => u.id === node.id)
    if (user) user.groupId = belongGroup
  }

  const forceNode = simulation.nodes().find((n: any) => n.id === node.id)
  if (forceNode) {
    forceNode.fx = null
    forceNode.fy = null
  }
}

// ========== 节点点击交互（新增Shift多选） ==========
const handleNodeClick = (nodeMouseEvent: any) => {
  const node = nodeMouseEvent.node
  if (node.type === 'groupNode') {
    toggleGroupCollapse(node.id)
    return
  }

  const mouseEvent = nodeMouseEvent.event as MouseEvent
  // Shift 多选
  if (mouseEvent?.shiftKey) {
    const idx = selectedNodeIds.value.indexOf(node.id)
    if (idx > -1) {
      selectedNodeIds.value.splice(idx, 1)
      nodes.value = nodes.value.map(n => n.id === node.id ? { ...n, selected: false } : n)
    } else {
      selectedNodeIds.value.push(node.id)
      nodes.value = nodes.value.map(n => n.id === node.id ? { ...n, selected: true } : n)
    }
    return
  }

  // 正常单击
  clearSelection()
  closeContextMenu()
  
  const relatedEdges = edges.value.filter(e => e.source === node.id || e.target === node.id)
  const relatedNodeIds = new Set<string>([node.id])
  
  relatedEdges.forEach(e => {
    relatedNodeIds.add(e.source)
    relatedNodeIds.add(e.target)
  })

  nodes.value = nodes.value.map(n => ({
    ...n,
    selected: relatedNodeIds.has(n.id)
  }))

  edges.value = edges.value.map(e => {
    const isActive = relatedEdges.some(re => re.id === e.id)
    return {
      ...e,
      style: {
        ...e.style,
        stroke: isActive ? '#f43f5e' : undefined,
        strokeWidth: isActive ? 4 : undefined
      }
    }
  })

  const index = userList.value.findIndex(u => u.id === node.id)
  currentIndex.value = index >= 0 ? index : 0
  showModal.value = true
}

const handleNodeDoubleClick = (nodeDragEvent: any) => {
  const node = nodeDragEvent.node
  if (node.type === 'groupNode') return
  setCenter(node.position.x, node.position.y, { duration: 500 })
  zoomTo(1.8, { duration: 500 })
}

// ========== 右键菜单处理 ==========
const handleNodeContextMenu = (edgeMouseEvent: any) => {
  const node = edgeMouseEvent.node
  if (node.type === 'groupNode') return
  const e = edgeMouseEvent.event as MouseEvent
  e?.preventDefault()
  clearAllActive()
  currentContextNode.value = node
  
  const menuWidth = 160
  const menuHeight = 320
  let x = e?.clientX ?? 0
  let y = e?.clientY ?? 0
  
  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
  
  contextMenuPos.value = { x, y }
  showContextMenu.value = true
}

const closeContextMenu = () => {
  showContextMenu.value = false
  currentContextNode.value = null
}

const viewDetailFromContext = () => {
  if (currentContextNode.value) {
    handleNodeClick({ node: currentContextNode.value, event: null })
  }
  closeContextMenu()
}

const zoomToNodeFromContext = () => {
  if (currentContextNode.value) {
    handleNodeDoubleClick({ node: currentContextNode.value })
  }
  closeContextMenu()
}

const upgradeIntimacyFromContext = () => {
  if (!currentContextNode.value) return
  upgradeIntimacy(currentContextNode.value.id)
  closeContextMenu()
}

const toggleConnectionFromContext = () => {
  if (!currentContextNode.value) return
  toggleConnectionById(currentContextNode.value.id)
  closeContextMenu()
}

const removeNode = () => {
  if (!currentContextNode.value) return
  const targetId = currentContextNode.value.id
  
  nodes.value = nodes.value.filter(n => n.id !== targetId)
  edges.value = edges.value.filter(e => e.source !== targetId && e.target !== targetId)
  userList.value = userList.value.filter(u => u.id !== targetId)
  
  restartForce()
  closeContextMenu()
}

// ========== 亲密度升级核心逻辑 ==========
const upgradeIntimacy = (targetId: string) => {
  const sourceId = '1'
  const edge = edges.value.find(e => 
    (e.source === sourceId && e.target === targetId) ||
    (e.source === targetId && e.target === sourceId)
  )
  
  if (!edge || !edge.data) return
  
  const currentLevel = edge.data.intimacy
  const nextLevel = currentLevel >= intimacyMaxLevel ? 1 : currentLevel + 1
  
  edges.value = edges.value.map(e => {
    if (e.id === edge.id) {
      return {
        ...e,
        data: { ...e.data, intimacy: nextLevel },
        className: `intimacy-${nextLevel}${e.className.includes('edge-active') ? ' edge-active' : ''}`
      }
    }
    return e
  })
}

const upgradeIntimacyFromSheet = () => {
  if (!currentActionNode.value) return
  upgradeIntimacy(currentActionNode.value.id)
  closeActionSheet()
}

// ========== 通用连接切换逻辑 ==========
const toggleConnectionById = (targetId: string) => {
  const sourceId = '1'
  const existEdge = edges.value.find(e => 
    (e.source === sourceId && e.target === targetId) ||
    (e.source === targetId && e.target === sourceId)
  )

  if (existEdge) {
    edges.value = edges.value.filter(e => e.id !== existEdge.id)
  } else {
    const newEdge = {
      id: `e${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      data: { intimacy: 1 },
      className: 'intimacy-1',
      hidden: false
    }
    edges.value = addEdge(newEdge, edges.value)
  }

  restartForce()
}

// ========== 新增用户入场动画 ==========
const addNewUser = (user: { id: string; name: string; avatar: string; bio: string; tags: string[]; online: boolean; groupId?: string }) => {
  const newUser = { groupId: 'g3', ...user }
  userList.value.push(newUser)
  
  const newNode: any = {
    id: user.id,
    type: 'userNode',
    position: { x: 300 + Math.random() * 100, y: 450 + Math.random() * 100 },
    data: { ...newUser, isNew: true },
    selected: false,
    hidden: false
  }
  
  nodes.value.push(newNode)
  restartForce()
  
  setTimeout(() => {
    const node = nodes.value.find(n => n.id === user.id)
    if (node) {
      node.data.isNew = false
    }
  }, 600)
}

const handleEdgeClick = (edgeMouseEvent: any) => {
  const edge = edgeMouseEvent.edge
  closeContextMenu()
  clearAllActive()
  
  nodes.value = nodes.value.map(n => ({
    ...n,
    selected: n.id === edge.source || n.id === edge.target
  }))

  edges.value = edges.value.map(e => {
    const isActive = e.id === edge.id
    return {
      ...e,
      style: {
        stroke: isActive ? '#f43f5e' : undefined,
        strokeWidth: isActive ? 4 : undefined
      }
    }
  })
}

const handleConnect = (params: Connection) => {
  const newEdge: Edge = {
    id: `e${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    data: { intimacy: 1 },
    animated: true,
    hidden: false
  }
  edges.value = [...edges.value, newEdge]
  restartForce()
}

const clearAllActive = () => {
  nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
  edges.value = edges.value.map(e => ({
    ...e,
    className: `intimacy-${e.data?.intimacy || 1}`
  }))
}

// ========== 弹窗左右滑动逻辑 ==========
const handleTouchStart = (e: TouchEvent) => {
  startX = e.touches[0].clientX
  isDragging = true
  slideOffset.value = 0
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging) return
  const currentX = e.touches[0].clientX
  const diff = currentX - startX
  const modalWidth = window.innerWidth
  slideOffset.value = (diff / modalWidth) * 100
}

const handleTouchEnd = () => {
  isDragging = false
  const threshold = 20
  
  if (slideOffset.value > threshold && currentIndex.value > 0) {
    currentIndex.value--
    syncCanvasWithCard()
  } else if (slideOffset.value < -threshold && currentIndex.value < userList.value.length - 1) {
    currentIndex.value++
    syncCanvasWithCard()
  }
  
  slideOffset.value = 0
}

const syncCanvasWithCard = () => {
  const currentUser = userList.value[currentIndex.value]
  const node = nodes.value.find(n => n.id === currentUser.id)
  if (node) {
    handleNodeClick({ node, event: null })
    showModal.value = true
  }
}

const getRelationWithCurrent = (targetId: string) => {
  const currentId = userList.value[currentIndex.value]?.id
  if (!currentId || currentId === targetId) return 0
  
  const edge = edges.value.find(e => 
    (e.source === currentId && e.target === targetId) ||
    (e.source === targetId && e.target === currentId)
  )
  
  return edge ? edge.data?.intimacy || 1 : 0
}

const closeModal = () => {
  showModal.value = false
  clearAllActive()
}

// ========== 搜索定位逻辑 ==========
const handleSearch = () => {
  showSearchDropdown.value = true
}

const locateUser = (userId: string) => {
  const node = nodes.value.find(n => n.id === userId)
  const user = userList.value.find(u => u.id === userId)
  if (!node || !user) return

  showSearchDropdown.value = false
  searchKeyword.value = ''

  const group = groups.value.find(g => g.id === user.groupId)
  if (group && group.collapsed) {
    toggleGroupCollapse(group.id)
  }

  setTimeout(() => {
    setCenter(node.position.x, node.position.y, { duration: 600 })
    zoomTo(1.2, { duration: 600 })
    
    setTimeout(() => {
      handleNodeClick({ node, event: null })
    }, 600)
  }, 300)
}

const handlePaneClick = () => {
  showSearchDropdown.value = false
  closeContextMenu()
  clearAllActive()
}

// ========== 长按操作菜单逻辑 ==========
const handleNodeLongPress = (node: Node) => {
  currentActionNode.value = node
  showActionSheet.value = true
}

const viewDetail = () => {
  closeActionSheet()
  if (currentActionNode.value) {
    handleNodeClick({ node: currentActionNode.value, event: null })
  }
}

const zoomToNode = () => {
  closeActionSheet()
  if (currentActionNode.value) {
    handleNodeDoubleClick({ node: currentActionNode.value })
  }
}

const toggleConnection = () => {
  if (!currentActionNode.value) return
  toggleConnectionById(currentActionNode.value.id)
  closeActionSheet()
}

const closeActionSheet = () => {
  showActionSheet.value = false
  currentActionNode.value = null
}

// ========== 生命周期 ==========
onMounted(() => {
  nextTick(() => {
    initForceLayout()
    initParticles()
    animateParticles()
    drawMinimap()
  })

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('touchmove', handleTouchMove)
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', closeContextMenu)

  const vueFlowEl = document.querySelector('.vue-flow')
  if (vueFlowEl) {
    vueFlowEl.addEventListener('toggle-collapse', ((e: CustomEvent) => {
      toggleGroupCollapse(e.detail)
    }) as EventListener)

    vueFlowEl.addEventListener('arrange-group', ((e: CustomEvent) => {
      arrangeGroupNodes(e.detail)
    }) as EventListener)
    
    vueFlowEl.addEventListener('long-press', ((e: CustomEvent) => {
      const node = nodes.value.find(n => n.id === e.detail.id)
      if (node && node.type === 'userNode') handleNodeLongPress(node)
    }) as EventListener)
  }
})

onUnmounted(() => {
  simulation?.stop()
  simulation = null
  
  if (particleAnimationId) cancelAnimationFrame(particleAnimationId)
  if (minimapAnimationId) cancelAnimationFrame(minimapAnimationId)
  if (longPressTimer) clearTimeout(longPressTimer)

  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', closeContextMenu)
})

watch(isDarkMode, () => {
  // 主题色自动适配
})

defineExpose({
  addNewUser,
  addUsersBatch,
  arrangeGroupNodes,
  toggleGroupCollapse,
  moveNodeToGroup,
  batchMoveToGroup,
  batchRemoveNodes,
  fitView
})
</script>

<style scoped>
/* ========== CSS变量：明暗主题统一管理 ========== */
:root {
  --bg-primary: #fafafa;
  --bg-card: #ffffff;
  --bg-hover: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #9ca3af;
  --border-color: #f0f0f0;
  --panel-bg: rgba(255, 255, 255, 0.85);
  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-strong: 0 6px 24px rgba(0, 0, 0, 0.12);
  
  --intimacy-1: #cbd5e1;
  --intimacy-2: #3b82f6;
  --intimacy-3: #ec4899;
  --active-color: #f43f5e;
  --online-color: #22c55e;
}

.dark {
  --bg-primary: #121212;
  --bg-card: #1e1e1e;
  --bg-hover: #2d2d2d;
  --text-primary: #e5e5e5;
  --text-secondary: #a3a3a3;
  --text-tertiary: #6b7280;
  --border-color: #2d2d2d;
  --panel-bg: rgba(30, 30, 30, 0.85);
  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-strong: 0 6px 24px rgba(0, 0, 0, 0.4);
  --intimacy-1: #475569;
  --intimacy-2: #60a5fa;
  --intimacy-3: #f472b6;
  --active-color: #fb7185;
  --online-color: #4ade80;
}
.social-map {
width: 100vw;
height: 100dvh;
position: relative;
background: var(--bg-primary);
touch-action: none;
-webkit-tap-highlight-color: transparent;
overflow: hidden;
transition: background 0.3s ease;
}
.particle-canvas {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 0;
pointer-events: none;
}
.theme-toggle {
position: fixed;
top: 16px;
right: 16px;
z-index: 15;
width: 40px;
height: 40px;
display: flex;
align-items: center;
justify-content: center;
background: var(--panel-bg);
backdrop-filter: blur(10px);
border-radius: 50%;
box-shadow: var(--shadow-soft);
cursor: pointer;
font-size: 18px;
transition: all 0.3s ease;
}
.theme-toggle:active {
transform: scale(0.95);
}
.search-box {
position: fixed;
top: 16px;
left: 16px;
z-index: 15;
width: 160px;
background: var(--panel-bg);
backdrop-filter: blur(10px);
border-radius: 20px;
box-shadow: var(--shadow-soft);
overflow: hidden;
transition: all 0.3s ease;
}
.search-box input {
width: 100%;
padding: 10px 16px;
border: none;
outline: none;
background: transparent;
font-size: 13px;
color: var(--text-primary);
box-sizing: border-box;
}
.search-box input::placeholder {
color: var(--text-tertiary);
}
.search-dropdown {
border-top: 1px solid var(--border-color);
max-height: 240px;
overflow-y: auto;
}
.search-item {
display: flex;
align-items: center;
gap: 10px;
padding: 10px 16px;
cursor: pointer;
transition: background 0.2s;
position: relative;
color: var(--text-primary);
}
.search-item:active {
background: var(--bg-hover);
}
.search-avatar {
width: 28px;
height: 28px;
border-radius: 50%;
}
.search-status {
position: absolute;
right: 16px;
width: 8px;
height: 8px;
border-radius: 50%;
background: var(--text-tertiary);
}
.search-status.online {
background: var(--online-color);
box-shadow: 0 0 4px color-mix(in srgb, var(--online-color) 60%, transparent);
}
/* ========== 新增：批量操作浮动栏 ========== */
.batch-toolbar {
position: fixed;
top: 16px;
left: 50%;
transform: translateX(-50%);
z-index: 20;
display: flex;
align-items: center;
gap: 16px;
padding: 8px 16px;
background: var(--panel-bg);
backdrop-filter: blur(10px);
border-radius: 24px;
box-shadow: var(--shadow-strong);
animation: fadeInDown 0.2s ease;
}
@keyframes fadeInDown {
from {
opacity: 0;
transform: translate(-50%, -8px);
}
to {
opacity: 1;
transform: translate(-50%, 0);
}
}
.batch-count {
font-size: 13px;
font-weight: 500;
color: var(--text-primary);
padding-right: 8px;
border-right: 1px solid var(--border-color);
}
.batch-actions {
display: flex;
gap: 4px;
align-items: center;
}
.batch-btn {
padding: 6px 12px;
font-size: 13px;
border-radius: 16px;
cursor: pointer;
color: var(--text-secondary);
transition: all 0.2s;
user-select: none;
}
.batch-btn:hover {
background: var(--bg-hover);
color: var(--text-primary);
}
.batch-btn.danger {
color: #ef4444;
}
.batch-btn.danger:hover {
background: rgba(239, 68, 68, 0.1);
}
.batch-submenu-trigger {
position: relative;
padding: 6px 12px;
font-size: 13px;
border-radius: 16px;
cursor: pointer;
color: var(--text-secondary);
transition: all 0.2s;
user-select: none;
}
.batch-submenu-trigger:hover {
background: var(--bg-hover);
color: var(--text-primary);
}
.batch-submenu {
position: absolute;
top: 100%;
left: 0;
margin-top: 6px;
width: 130px;
background: var(--bg-card);
border-radius: 8px;
box-shadow: var(--shadow-strong);
padding: 6px;
opacity: 0;
visibility: hidden;
transform: translateY(-4px);
transition: all 0.15s ease;
}
.batch-submenu-trigger:hover .batch-submenu {
opacity: 1;
visibility: visible;
transform: translateY(0);
}
.batch-subitem {
display: flex;
align-items: center;
gap: 8px;
padding: 8px 10px;
font-size: 13px;
border-radius: 6px;
cursor: pointer;
transition: background 0.15s;
color: var(--text-primary);
}
.batch-subitem:hover {
background: var(--bg-hover);
}
/* ========== 新增：连线标签样式 ========== */
.edge-label {
position: absolute;
pointer-events: none;
z-index: 3;
}
.edge-label-text {
display: inline-block;
padding: 2px 8px;
font-size: 11px;
font-weight: 500;
border-radius: 10px;
background: var(--bg-card);
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
white-space: nowrap;
}
.edge-label-text.intimacy-1 {
color: var(--intimacy-1);
border: 1px solid color-mix(in srgb, var(--intimacy-1) 30%, transparent);
}
.edge-label-text.intimacy-2 {
color: var(--intimacy-2);
border: 1px solid color-mix(in srgb, var(--intimacy-2) 30%, transparent);
}
.edge-label-text.intimacy-3 {
color: var(--intimacy-3);
border: 1px solid color-mix(in srgb, var(--intimacy-3) 30%, transparent);
}
/* ========== 新增：框选遮罩 ========== */
.selection-box {
position: absolute;
border: 1px dashed var(--intimacy-2);
background: color-mix(in srgb, var(--intimacy-2) 10%, transparent);
pointer-events: none;
z-index: 10;
}
/* ========== 新增：标签显隐开关 ========== */
.label-toggle {
position: fixed;
bottom: 220px;
right: 16px;
z-index: 5;
padding: 8px 12px;
font-size: 12px;
background: var(--panel-bg);
backdrop-filter: blur(10px);
border-radius: 16px;
box-shadow: var(--shadow-soft);
cursor: pointer;
color: var(--text-secondary);
transition: all 0.2s;
user-select: none;
}
.label-toggle:hover {
color: var(--text-primary);
box-shadow: var(--shadow-strong);
}
.minimap-wrap {
position: fixed;
bottom: 70px;
right: 16px;
z-index: 5;
border-radius: 8px;
overflow: hidden;
box-shadow: var(--shadow-soft);
border: 1px solid var(--border-color);
}
.minimap-canvas {
display: block;
width: 200px;
height: 140px;
cursor: crosshair;
}
/* ========== 分组节点样式 ========== */
:deep(.group-node) {
width: 320px;
height: 280px;
border: 2px dashed;
border-radius: 16px;
padding: 0;
box-sizing: border-box;
pointer-events: all;
cursor: move;
backdrop-filter: blur(4px);
transition: height 0.3s ease, all 0.3s ease, box-shadow 0.2s ease;
overflow: hidden;
}
:deep(.group-node.snap-active) {
border-width: 3px;
box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 15%, transparent),
0 0 20px color-mix(in srgb, currentColor 30%, transparent);
}
:deep(.group-node.collapsed) {
height: 48px;
}
:deep(.group-header) {
display: flex;
align-items: center;
justify-content: space-between;
padding: 12px 16px;
height: 48px;
box-sizing: border-box;
}
:deep(.group-actions) {
display: flex;
gap: 8px;
align-items: center;
}
:deep(.header-btn) {
font-size: 12px;
padding: 2px 8px;
border-radius: 10px;
background: rgba(255,255,255,0.5);
cursor: pointer;
user-select: none;
color: var(--text-secondary);
transition: background 0.2s;
}
:deep(.header-btn:hover) {
background: rgba(255,255,255,0.8);
}
:deep(.group-title) {
font-size: 14px;
font-weight: 600;
user-select: none;
}
/* 用户节点样式 */
:deep(.user-node) {
display: flex;
flex-direction: column;
align-items: center;
gap: 6px;
cursor: grab;
transition: all 0.3s ease;
padding: 12px;
border-radius: 12px;
user-select: none;
z-index: 2;
}
:deep(.user-node.node-enter) {
animation: nodeEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
transform-origin: center;
}
@keyframes nodeEnter {
0% {
opacity: 0;
transform: scale(0);
}
60% {
transform: scale(1.15);
}
100% {
opacity: 1;
transform: scale(1);
}
}
:deep(.user-node:active) {
cursor: grabbing;
}
:deep(.avatar-wrap) {
position: relative;
}
:deep(.user-node .avatar) {
width: 56px;
height: 56px;
border-radius: 50%;
border: 2px solid var(--bg-card);
box-shadow: 0 2px 8px rgba(0,0,0,0.1);
animation: breath 3s ease-in-out infinite;
pointer-events: none;
display: block;
}
:deep(.status-dot) {
position: absolute;
right: 0;
bottom: 0;
width: 14px;
height: 14px;
border-radius: 50%;
border: 2px solid var(--bg-card);
background: var(--text-tertiary);
box-sizing: border-box;
}
:deep(.status-dot.online) {
background: var(--online-color);
animation: statusPulse 2s ease-in-out infinite;
}
@keyframes statusPulse {
0%, 100% {
box-shadow: 0 0 0 0 color-mix(in srgb, var(--online-color) 50%, transparent);
}
50% {
box-shadow: 0 0 0 4px color-mix(in srgb, var(--online-color) 0%, transparent);
}
}
:deep(.user-node .name) {
font-size: 13px;
color: var(--text-primary);
font-weight: 500;
white-space: nowrap;
}
:deep(.user-node.node-active .avatar) {
border-color: var(--active-color);
box-shadow: 0 0 0 4px color-mix(in srgb, var(--active-color) 20%, transparent),
0 0 16px color-mix(in srgb, var(--active-color) 40%, transparent);
transform: scale(1.1);
animation: none;
}
:deep(.user-node.node-active .name) {
color: var(--active-color);
font-weight: 600;
}
@keyframes breath {
0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
50% { box-shadow: 0 2px 16px color-mix(in srgb, var(--intimacy-2) 40%, transparent); }
}
/* 连接手柄 */
:deep(.connect-handle) {
width: 16px !important;
height: 16px !important;
background: var(--intimacy-2);
border: 2px solid var(--bg-card);
opacity: 0;
transition: opacity 0.2s;
}
:deep(.user-node:active .connect-handle) {
opacity: 1;
}
/* ========== 连线样式 + 流动动画 ========== */
:deep(.vue-flow__edge-path) {
transition: stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease;
stroke-dasharray: 8 4;
}
:deep(.vue-flow__edge.intimacy-1 .vue-flow__edge-path) {
stroke: var(--intimacy-1);
stroke-width: 1.5;
animation: edgeFlow 3s linear infinite;
}
:deep(.vue-flow__edge.intimacy-2 .vue-flow__edge-path) {
stroke: var(--intimacy-2);
stroke-width: 2.2;
animation: edgeFlow 2s linear infinite;
}
:deep(.vue-flow__edge.intimacy-3 .vue-flow__edge-path) {
stroke: var(--intimacy-3);
stroke-width: 3;
animation: edgeFlow 1.2s linear infinite;
}
:deep(.vue-flow__edge.edge-active .vue-flow__edge-path) {
stroke: var(--active-color);
stroke-width: 4;
filter: drop-shadow(0 0 6px color-mix(in srgb, var(--active-color) 60%, transparent));
animation: edgeFlow 0.8s linear infinite;
}
@keyframes edgeFlow {
from {
stroke-dashoffset: 24;
}
to {
stroke-dashoffset: 0;
}
}
/* ========== 右键二级子菜单样式 ========== */
.context-submenu-trigger {
position: relative;
}
.context-submenu {
position: absolute;
top: 0;
left: 100%;
margin-left: 4px;
width: 140px;
background: var(--bg-card);
border-radius: 8px;
box-shadow: var(--shadow-strong);
padding: 6px;
opacity: 0;
visibility: hidden;
transform: translateX(-8px);
transition: all 0.15s ease;
}
.context-submenu-trigger:hover .context-submenu {
opacity: 1;
visibility: visible;
transform: translateX(0);
}
.context-subitem {
display: flex;
align-items: center;
gap: 8px;
padding: 8px 10px;
font-size: 13px;
border-radius: 6px;
cursor: pointer;
transition: background 0.15s;
color: var(--text-primary);
}
.context-subitem:hover {
background: var(--bg-hover);
}
.submenu-dot {
width: 8px;
height: 8px;
border-radius: 50%;
flex-shrink: 0;
}
/* 顶部悬浮公告 */
.float-banner {
position: fixed;
top: 16px;
left: 50%;
transform: translateX(-50%);
z-index: 10;
width: 50vw;
max-width: 320px;
background: var(--panel-bg);
backdrop-filter: blur(10px);
padding: 10px 20px;
border-radius: 20px;
box-shadow: var(--shadow-soft);
font-size: 13px;
color: var(--text-secondary);
overflow: hidden;
white-space: nowrap;
transition: all 0.3s ease;
}
.banner-scroll {
animation: scroll 15s linear infinite;
}
@keyframes scroll {
0% { transform: translateX(100%); }
100% { transform: translateX(-100%); }
}
/* 滑动弹窗容器 */
.user-modal {
position: fixed;
inset: 0;
background: rgba(0,0,0,0.4);
display: flex;
align-items: flex-end;
justify-content: center;
z-index: 20;
animation: fadeIn 0.2s ease;
overflow: hidden;
}
.card-wrapper {
display: flex;
width: 100%;
transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
will-change: transform;
}
.modal-card {
flex-shrink: 0;
width: 100%;
background: var(--bg-card);
border-radius: 20px 20px 0 0;
padding: 24px 24px 32px;
box-sizing: border-box;
text-align: center;
animation: slideUp 0.3s ease;
color: var(--text-primary);
transition: background 0.3s ease;
}
.modal-handle {
width: 40px;
height: 4px;
background: var(--border-color);
border-radius: 2px;
margin: 0 auto 16px;
}
.modal-avatar-wrap {
position: relative;
display: inline-block;
margin-bottom: 12px;
}
.modal-avatar {
width: 72px;
height: 72px;
border-radius: 50%;
display: block;
}
.modal-status {
position: absolute;
right: 0;
bottom: 0;
width: 18px;
height: 18px;
border-radius: 50%;
border: 2px solid var(--bg-card);
background: var(--text-tertiary);
box-sizing: border-box;
}
.modal-status.online {
background: var(--online-color);
animation: statusPulse 2s ease-in-out infinite;
}
.modal-status-text {
font-size: 12px;
color: var(--text-tertiary);
margin: 0 0 8px;
}
.modal-desc {
color: var(--text-secondary);
margin: 8px 0 12px;
font-size: 14px;
}
.relation-info {
margin-bottom: 16px;
}
.relation-tag {
display: inline-block;
padding: 4px 12px;
border-radius: 12px;
font-size: 12px;
font-weight: 500;
}
.intimacy-1 {
background: color-mix(in srgb, var(--intimacy-1) 20%, transparent);
color: var(--intimacy-1);
}
.intimacy-2 {
background: color-mix(in srgb, var(--intimacy-2) 10%, transparent);
color: var(--intimacy-2);
}
.intimacy-3 {
background: color-mix(in srgb, var(--intimacy-3) 10%, transparent);
color: var(--intimacy-3);
}
.modal-tags {
display: flex;
gap: 8px;
justify-content: center;
flex-wrap: wrap;
margin-bottom: 20px;
}
.tag {
padding: 4px 10px;
background: color-mix(in srgb, var(--intimacy-2) 10%, transparent);
color: var(--intimacy-2);
border-radius: 12px;
font-size: 12px;
}
.close-btn {
width: 100%;
padding: 12px;
border: none;
background: var(--intimacy-2);
color: #fff;
border-radius: 10px;
cursor: pointer;
font-size: 15px;
transition: background 0.3s ease;
}
/* 长按操作菜单样式 */
.action-sheet-mask {
position: fixed;
inset: 0;
background: rgba(0,0,0,0.4);
z-index: 30;
display: flex;
align-items: flex-end;
animation: fadeIn 0.2s ease;
}
.action-sheet {
width: 100%;
background: var(--bg-card);
border-radius: 20px 20px 0 0;
padding: 16px 16px 24px;
box-sizing: border-box;
animation: slideUp 0.3s ease;
color: var(--text-primary);
transition: background 0.3s ease;
}
.action-sheet-header {
display: flex;
align-items: center;
gap: 12px;
padding: 12px 16px 16px;
border-bottom: 1px solid var(--border-color);
}
.action-avatar-wrap {
position: relative;
}
.action-avatar {
width: 40px;
height: 40px;
border-radius: 50%;
display: block;
}
.action-status {
position: absolute;
right: 0;
bottom: 0;
width: 12px;
height: 12px;
border-radius: 50%;
border: 2px solid var(--bg-card);
background: var(--text-tertiary);
box-sizing: border-box;
}
.action-status.online {
background: var(--online-color);
}
.action-user-info {
display: flex;
flex-direction: column;
gap: 2px;
}
.action-name {
font-weight: 500;
font-size: 15px;
}
.action-status-text {
font-size: 12px;
color: var(--text-tertiary);
}
.action-list {
padding: 8px 0;
}
.action-item {
display: flex;
align-items: center;
gap: 12px;
padding: 14px 16px;
font-size: 15px;
border-radius: 10px;
cursor: pointer;
}
.action-item:active {
background: var(--bg-hover);
}
.action-item.danger {
color: #ef4444;
}
.action-cancel {
margin-top: 8px;
padding: 14px;
text-align: center;
font-size: 15px;
color: var(--text-secondary);
background: var(--bg-hover);
border-radius: 10px;
cursor: pointer;
}
/* 右键菜单样式 */
.context-menu {
position: fixed;
z-index: 40;
width: 160px;
background: var(--bg-card);
border-radius: 10px;
box-shadow: var(--shadow-strong);
padding: 6px;
animation: fadeInScale 0.15s ease;
color: var(--text-primary);
transition: background 0.3s ease;
}
@keyframes fadeInScale {
from {
opacity: 0;
transform: scale(0.95);
}
to {
opacity: 1;
transform: scale(1);
}
}
.context-item {
display: flex;
align-items: center;
gap: 10px;
padding: 10px 12px;
font-size: 14px;
border-radius: 6px;
cursor: pointer;
transition: background 0.15s;
}
.context-item:hover {
background: var(--bg-hover);
}
.context-item.danger {
color: #ef4444;
}
.context-divider {
height: 1px;
background: var(--border-color);
margin: 4px 0;
}
@keyframes fadeIn {
from { opacity: 0; }
to { opacity: 1; }
}
@keyframes slideUp {
from { transform: translateY(100%); }
to { transform: translateY(0); }
}
/* 画布控件适配 */
:deep(.vue-flow__controls) {
transform: scale(0.9);
bottom: 20px !important;
right: 16px !important;
background: var(--bg-card) !important;
border-radius: 8px !important;
box-shadow: var(--shadow-soft) !important;
transition: background 0.3s ease;
z-index: 5;
}
:deep(.vue-flow__controls button) {
background: transparent !important;
color: var(--text-primary) !important;
border-bottom-color: var(--border-color) !important;
}
:deep(.vue-flow__controls button:hover) {
background: var(--bg-hover) !important;
}
/* 暗黑模式画布背景 */
:deep(.dark-flow .vue-flow__pane) {
background: transparent;
transition: background 0.3s ease;
}
/* 小屏适配 */
@media (max-width: 480px) {
.float-banner {
display: none;
}
.batch-toolbar {
width: calc(100vw - 32px);
flex-wrap: wrap;
justify-content: center;
}
.search-box {
width: calc(100vw - 100px);
}
.context-menu {
display: none;
}
.minimap-wrap {
display: none;
}
.label-toggle {
display: none;
}
:deep(.group-node) {
width: 280px;
height: 240px;
}
:deep(.group-node.collapsed) {
height: 48px;
}
:deep(.header-btn) {
padding: 2px 6px;
font-size: 11px;
}
}

</style>