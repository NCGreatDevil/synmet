import { ref, computed, onUnmounted } from 'vue'
import { useVueFlow, type Edge, type NodeChange, type EdgeChange } from '@vue-flow/core'
import type { UserData, UserStatus } from '@/types'
import pb, { getUserAvatarUrl } from '@/lib/pocketbase'
import { useAuthStore } from '@/stores/auth'

/** 活跃阈值：5分钟内无操作，从"活跃"降为"在线" */
const ACTIVE_THRESHOLD = 5 * 60 * 1000
/** 离线阈值：120分钟无操作，自动设为离线并清除登录状态 */
const OFFLINE_THRESHOLD = 120 * 60 * 1000

/** 根据 is_online 和 last_active_at 计算用户状态 */
const computeStatus = (user: any): UserStatus => {
  if (!user.is_online) return 'offline'
  const lastActive = user.last_active_at ? new Date(user.last_active_at).getTime() : 0
  return Date.now() - lastActive < ACTIVE_THRESHOLD ? 'active' : 'online'
}

export function useGraph() {
  const { applyNodeChanges, applyEdgeChanges } = useVueFlow()
  const authStore = useAuthStore()

  const selectedEdgeId = ref<string | null>(null)
  const activeUser = ref<any>(null)
  const selectedEdge = ref<any>(null) // 选中的连线信息（包含两端用户数据）
  const loading = ref(true)
  const nodes = ref<any[]>([])
  const edges = ref<any[]>([])

  // ==================== 节点位置生成 ====================

  const MIN_SPACING = 90
  const MAX_RETRIES = 100

  /** 生成不重叠的随机节点位置 */
  const generateRandomPositions = (count: number) => {
    const padding = 0.1
    const width = window.innerWidth * (1 - padding * 2)
    const height = window.innerHeight * (1 - padding * 2)
    const offsetX = window.innerWidth * padding
    const offsetY = window.innerHeight * padding

    const positions: { x: number; y: number }[] = []

    for (let i = 0; i < count; i++) {
      let attempts = 0
      let validPosition = false

      while (!validPosition && attempts < MAX_RETRIES) {
        attempts++
        const x = offsetX + Math.random() * width
        const y = offsetY + Math.random() * height

        validPosition = positions.every(pos => {
          const dx = x - pos.x
          const dy = y - pos.y
          return Math.sqrt(dx * dx + dy * dy) >= MIN_SPACING
        })

        if (validPosition) {
          positions.push({ x, y })
        }
      }

      if (!validPosition) {
        positions.push({ x: offsetX + Math.random() * width, y: offsetY + Math.random() * height })
      }
    }

    return positions
  }

  // ==================== 数据加载 ====================

  const loadUsers = async () => {
    loading.value = true
    try {
      const users = await pb.collection('users').getFullList({
        filter: 'status = 1',
        sort: '-id'
      })

      const stats = await pb.collection('user_stats').getFullList()
      const statsMap = new Map<string, any>()
      stats.forEach(s => statsMap.set(s.user_id, s))

      const tags = await pb.collection('user_tags').getFullList()
      const tagsMap = new Map<string, string[]>()
      tags.forEach(t => {
        const existing = tagsMap.get(t.user_id) || []
        existing.push(t.tag_name)
        tagsMap.set(t.user_id, existing)
      })

      const userDataList: UserData[] = users.map(u => ({
        id: u.id,
        name: u.username || u.name || u.email,
        avatar: getUserAvatarUrl(u as any),
        bio: u.bio || '',
        tags: tagsMap.get(u.id) || [],
        status: computeStatus(u),
        interaction: statsMap.get(u.id)?.interaction_count || 0,
        popularity: statsMap.get(u.id)?.popularity_score || 0,
        gender: (u as any).gender || 0,
        age: (u as any).age || null
      }))

      const positions = generateRandomPositions(userDataList.length)
      const nodeList = userDataList.map((user, index) => ({
        id: user.id,
        type: 'userNode',
        position: positions[index],
        data: user
      }))
      nodes.value = nodeList
      edges.value = []
    } catch (error) {
      console.error('加载用户数据失败:', error)
    } finally {
      loading.value = false
    }
  }

  loadUsers()

  // ==================== Realtime 订阅 ====================

  pb.collection('users').subscribe('*', async (e) => {
    try {
      if (e.action === 'create') {
        if (e.record.status === 1) {
          const stat = await pb.collection('user_stats').getFirstListItem(`user_id="${e.record.id}"`).catch(() => null)
          const tags = await pb.collection('user_tags').getFullList({ filter: `user_id="${e.record.id}"` })
          const node = {
            id: e.record.id,
            type: 'userNode',
            position: {
              x: Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1,
              y: Math.random() * window.innerHeight * 0.8 + window.innerHeight * 0.1
            },
            data: {
              id: e.record.id,
              name: e.record.username || e.record.name || e.record.email,
              avatar: getUserAvatarUrl(e.record),
              bio: e.record.bio || '',
              tags: tags.map((t: any) => t.tag_name),
              status: computeStatus(e.record),
              interaction: stat?.interaction_count || 0,
              popularity: stat?.popularity_score || 0,
              gender: e.record.gender || 0
            }
          }
          nodes.value.push(node)
        }
      } else if (e.action === 'update') {
        const record = e.record
        if (record.status === 0) {
          nodes.value = nodes.value.filter((n: any) => n.id !== record.id)
        } else if (record.status === 1) {
          const exists = nodes.value.some((n: any) => n.id === record.id)
          if (!exists) {
            const stat = await pb.collection('user_stats').getFirstListItem(`user_id="${record.id}"`).catch(() => null)
            const tags = await pb.collection('user_tags').getFullList({ filter: `user_id="${record.id}"` })
            const node = {
              id: record.id,
              type: 'userNode',
              position: {
                x: Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1,
                y: Math.random() * window.innerHeight * 0.8 + window.innerHeight * 0.1
              },
              data: {
                id: record.id,
                name: record.username || record.name || record.email,
                avatar: getUserAvatarUrl(record),
                bio: record.bio || '',
                tags: tags.map((t: any) => t.tag_name),
                status: computeStatus(record),
                interaction: stat?.interaction_count || 0,
                popularity: stat?.popularity_score || 0,
                gender: record.gender || 0
              }
            }
            nodes.value.push(node)
          } else {
            const newStatus = computeStatus(record)
            nodes.value = nodes.value.map((n: any) =>
              n.id === record.id ? { ...n, data: { ...n.data, status: newStatus } } : n
            )
          }
        }
      } else if (e.action === 'delete') {
        nodes.value = nodes.value.filter((n: any) => n.id !== e.record.id)
      }
    } catch (error) {
      console.error('Realtime 更新节点失败:', error)
    }
  })

  // ==================== 当前用户活动追踪 ====================

  let lastActiveTime = Date.now()
  let isAutoOffline = false
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let statusCheckTimer: ReturnType<typeof setInterval> | null = null

  /** 更新最后活跃时间到数据库 */
  const updateLastActive = async () => {
    if (!authStore.currentUser) return
    lastActiveTime = Date.now()
    try {
      await pb.collection('users').update(authStore.currentUser.id, {
        last_active_at: new Date().toISOString()
      })
    } catch {
      // last_active_at 字段可能不存在，忽略
    }
  }

  /** 自动设为离线，清除登录状态并跳转登录页 */
  const setOffline = async () => {
    if (!authStore.currentUser || isAutoOffline) return
    isAutoOffline = true
    try {
      await pb.collection('users').update(authStore.currentUser.id, { is_online: 0 })
    } catch {}
    pb.authStore.clear()
    authStore.currentUser = null
    localStorage.removeItem('pb_auth_token')
    window.location.href = '/'
  }

  const onUserActivity = () => {
    lastActiveTime = Date.now()
  }

  // 监听用户操作事件
  const activityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart']
  activityEvents.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }))

  // 心跳：每30秒检查，更新 last_active_at 或自动离线
  heartbeatTimer = setInterval(() => {
    if (Date.now() - lastActiveTime > OFFLINE_THRESHOLD) {
      setOffline()
    } else {
      updateLastActive()
    }
  }, 30000)

  // 状态检查：每10秒刷新当前节点的状态显示
  statusCheckTimer = setInterval(() => {
    const now = Date.now()
    nodes.value = nodes.value.map(n => {
      if (n.id === authStore.currentUser?.id) {
        const newStatus: UserStatus = isAutoOffline
          ? 'offline'
          : (now - lastActiveTime < ACTIVE_THRESHOLD ? 'active' : 'online')
        return n.data.status !== newStatus ? { ...n, data: { ...n.data, status: newStatus } } : n
      }
      return n
    })
  }, 10000)

  // 初始设置当前用户为活跃
  if (authStore.currentUser) {
    updateLastActive()
  }

  onUnmounted(() => {
    activityEvents.forEach(evt => window.removeEventListener(evt, onUserActivity))
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (statusCheckTimer) clearInterval(statusCheckTimer)
    pb.collection('users').unsubscribe('*')
  })

  // ==================== 节点交互 ====================

  const availableTags = computed(() => {
    const tagSet = new Set<string>()
    nodes.value.forEach((n: any) => {
      n.data.tags?.forEach((tag: string) => tagSet.add(tag))
    })
    return Array.from(tagSet)
  })

  const onNodesChange = (changes: NodeChange[]) => {
    applyNodeChanges(changes.filter(c => c.type !== 'remove'))
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    const filtered = changes.filter(c => c.type !== 'remove' || c.id === selectedEdgeId.value)
    applyEdgeChanges(filtered)
    if (filtered.some(c => c.type === 'remove')) {
      selectedEdgeId.value = null
    }
  }

  const refreshPage = () => window.location.reload()

  /** 更新用户统计数据（人气/互动） */
  const updateStatsInDB = async (userId: string, popularityDelta: number, interactionDelta: number) => {
    try {
      const stat = await pb.collection('user_stats').getFirstListItem(`user_id="${userId}"`)
      const newPopularity = Math.max(0, (stat.popularity_score || 0) + popularityDelta)
      const newInteraction = Math.max(0, (stat.interaction_count || 0) + interactionDelta)

      await pb.collection('user_stats').update(stat.id, {
        popularity_score: newPopularity,
        interaction_count: newInteraction
      })

      nodes.value = nodes.value.map(n => {
        if (n.id === userId) {
          const updated = { ...n, data: { ...n.data, popularity: newPopularity, interaction: newInteraction } }
          if (activeUser.value?.id === userId) activeUser.value = updated
          return updated
        }
        return n
      })
    } catch (error) {
      console.error('更新统计数据失败:', error)
    }
  }

  const increasePopularity = async () => {
    if (activeUser.value) await updateStatsInDB(activeUser.value.id, 1, 1)
  }

  const decreasePopularity = async () => {
    if (activeUser.value) await updateStatsInDB(activeUser.value.id, -1, 1)
  }

  /** 清除所有选中/高亮状态 */
  const clearAllActive = () => {
    nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
    edges.value = edges.value.map(e => ({
      ...e,
      animated: false,
      style: { stroke: '#b1b1b7', strokeWidth: 1.5 }
    }))
    activeUser.value = null
    selectedEdgeId.value = null
  }

  const handleNodeClick = ({ node }: any) => {
    clearAllActive()
    highlightRelated(node.id)
  }

  const handleNodeDoubleClick = ({ node }: any) => {
    clearAllActive()
    highlightRelated(node.id)
    activeUser.value = node
    return node
  }

  const handleEdgeClick = ({ edge }: any) => {
    clearAllActive()
    selectedEdgeId.value = edge.id
    
    // 高亮选中的连线和两端节点
    nodes.value = nodes.value.map(n => ({
      ...n,
      selected: n.id === edge.source || n.id === edge.target
    }))
    edges.value = edges.value.map(e => ({
      ...e,
      animated: e.id === edge.id,
      style: { stroke: e.id === edge.id ? '#ff4d6d' : '#b1b1b7', strokeWidth: e.id === edge.id ? 3 : 1.5 }
    }))
    
    // 获取连线两端的用户数据
    const sourceNode = nodes.value.find((n: any) => n.id === edge.source)
    const targetNode = nodes.value.find((n: any) => n.id === edge.target)
    
    if (sourceNode && targetNode) {
      selectedEdge.value = {
        id: edge.id,
        userA: sourceNode.data,
        userB: targetNode.data
      }
    }
  }
  
  /** 取消匹配：删除连线并隐藏面板 */
  const cancelMatch = () => {
    if (!selectedEdgeId.value) return
    
    const edgeId = selectedEdgeId.value
    edges.value = edges.value.filter((e: any) => e.id !== edgeId)
    selectedEdgeId.value = null
    selectedEdge.value = null
    
    // 清除高亮
    nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
    edges.value = edges.value.map(e => ({
      ...e,
      animated: false,
      style: { stroke: '#b1b1b7', strokeWidth: 1.5 }
    }))
  }
  
  /** 关闭匹配面板（保留连线） */
  const closeMatchPanel = () => {
    selectedEdgeId.value = null
    selectedEdge.value = null
    
    // 清除高亮
    nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
    edges.value = edges.value.map(e => ({
      ...e,
      animated: false,
      style: { stroke: '#b1b1b7', strokeWidth: 1.5 }
    }))
  }

  const handleConnect = (params: any) => {
    if (params.source === params.target) throw new Error('节点不能连接自己')

    const exists = edges.value.some(
      (e: any) => (e.source === params.source && e.target === params.target) ||
                  (e.source === params.target && e.target === params.source)
    )
    if (exists) throw new Error('这两个节点已经连接了')

    const newEdge: Edge = {
      id: `e${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      animated: true
    }
    edges.value = [...edges.value, newEdge]
    
    // 连线成功后，设置选中的连线信息（用于显示匹配面板）
    const sourceNode = nodes.value.find((n: any) => n.id === params.source)
    const targetNode = nodes.value.find((n: any) => n.id === params.target)
    
    if (sourceNode && targetNode) {
      selectedEdgeId.value = newEdge.id
      selectedEdge.value = {
        id: newEdge.id,
        userA: sourceNode.data,
        userB: targetNode.data
      }
      
      // 高亮新创建的连线和两端节点
      nodes.value = nodes.value.map(n => ({
        ...n,
        selected: n.id === params.source || n.id === params.target
      }))
      edges.value = edges.value.map(e => ({
        ...e,
        animated: e.id === newEdge.id,
        style: { stroke: e.id === newEdge.id ? '#ff4d6d' : '#b1b1b7', strokeWidth: e.id === newEdge.id ? 3 : 1.5 }
      }))
    }
  }

  /** 高亮与指定节点相关的边和节点 */
  const highlightRelated = (nodeId: string) => {
    const relatedEdges = edges.value.filter((e: any) => e.source === nodeId || e.target === nodeId)
    const relatedNodeIds = new Set<string>([nodeId])
    relatedEdges.forEach((e: any) => {
      relatedNodeIds.add(e.source)
      relatedNodeIds.add(e.target)
    })

    nodes.value = nodes.value.map(n => ({
      ...n,
      selected: relatedNodeIds.has(n.id)
    }))

    edges.value = edges.value.map(e => {
      const isRelated = relatedEdges.some((re: any) => re.id === e.id)
      return {
        ...e,
        animated: isRelated,
        style: { stroke: isRelated ? '#ff4d6d' : '#b1b1b7', strokeWidth: isRelated ? 3 : 1.5 }
      }
    })
  }

  return {
    nodes,
    edges,
    selectedEdgeId,
    selectedEdge,
    activeUser,
    loading,
    availableTags,
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
  }
}
