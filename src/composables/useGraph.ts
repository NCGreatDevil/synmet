import { ref, computed, onUnmounted } from 'vue'
import { useVueFlow, type Node, type Edge, type NodeChange, type EdgeChange } from '@vue-flow/core'
import type { UserData, UserStatus } from '@/types'
import pb, { getUserAvatarUrl } from '@/lib/pocketbase'
import { useAuthStore } from '@/stores/auth'

const ACTIVE_THRESHOLD = 5 * 60 * 1000 // 5分钟，活跃→在线
const OFFLINE_THRESHOLD = 120 * 60 * 1000 // 120分钟无操作，自动离线

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
  const activeUser = ref<Node | null>(null)
  const loading = ref(true)

  const MIN_SPACING = 90
  const MAX_RETRIES = 100

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
          const distance = Math.sqrt(dx * dx + dy * dy)
          return distance >= MIN_SPACING
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

  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])

  const buildNodeData = async (record: any): Promise<Node | null> => {
    if (record.status === 0) return null // 禁用用户不显示
    let stat: any = null
    try {
      stat = await pb.collection('user_stats').getFirstListItem(`user_id="${record.id}"`)
    } catch {
      // user_stats 可能还未创建
    }
    const tags = await pb.collection('user_tags').getFullList({ filter: `user_id="${record.id}"` })
    const avatarUrl = getUserAvatarUrl(record)
    return {
      id: record.id,
      type: 'userNode',
      position: {
        x: Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1,
        y: Math.random() * window.innerHeight * 0.8 + window.innerHeight * 0.1
      },
      data: {
        id: record.id,
        name: record.username || record.name || record.email,
        avatar: avatarUrl,
        bio: record.bio || '',
        tags: tags.map((t: any) => t.tag_name),
        status: computeStatus(record),
        interaction: stat?.interaction_count || 0,
        popularity: stat?.popularity_score || 0,
        gender: record.gender || 0
      }
    }
  }

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

      const userDataList: UserData[] = users.map(u => {
        const stat = statsMap.get(u.id)
        const avatarUrl = getUserAvatarUrl(u as any)
        return {
          id: u.id,
          name: u.username || u.name || u.email,
          avatar: avatarUrl,
          bio: u.bio || '',
          tags: tagsMap.get(u.id) || [],
          status: computeStatus(u),
          interaction: stat?.interaction_count || 0,
          popularity: stat?.popularity_score || 0,
          gender: (u as any).gender || 0
        }
      })

      const positions = generateRandomPositions(userDataList.length)
      const nodeList: Node[] = userDataList.map((user, index): Node => ({
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

  // Realtime 监听用户变化
  pb.collection('users').subscribe('*', async (e) => {
    try {
      if (e.action === 'create') {
        if (e.record.status === 1) {
          const node = await buildNodeData(e.record)
          if (node) nodes.value = [...(nodes.value as any), node]
        }
      } else if (e.action === 'update') {
        const record = e.record
        if (record.status === 0) {
          nodes.value = (nodes.value as any).filter((n: any) => n.id !== record.id)
        } else if (record.status === 1) {
          const exists = (nodes.value as any).some((n: any) => n.id === record.id)
          if (!exists) {
            const node = await buildNodeData(record)
            if (node) nodes.value = [...(nodes.value as any), node]
          } else {
            // 只更新状态相关字段，不重新请求 tags/stats
            const newStatus = computeStatus(record)
            nodes.value = (nodes.value as any).map((n: any) =>
              n.id === record.id ? { ...n, data: { ...n.data, status: newStatus } } : n
            )
          }
        }
      } else if (e.action === 'delete') {
        nodes.value = (nodes.value as any).filter((n: any) => n.id !== e.record.id)
      }
    } catch (error) {
      console.error('Realtime 更新节点失败:', error)
    }
  })

  // ===== 当前用户活动追踪 =====
  let lastActiveTime = Date.now()
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let statusCheckTimer: ReturnType<typeof setInterval> | null = null
  let isAutoOffline = false // 是否已自动设为离线

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

  const setOffline = async () => {
    if (!authStore.currentUser || isAutoOffline) return
    isAutoOffline = true
    try {
      await pb.collection('users').update(authStore.currentUser.id, {
        is_online: 0
      })
    } catch {}
    // 清除登录状态，跳转登录页
    pb.authStore.clear()
    authStore.currentUser = null
    localStorage.removeItem('pb_auth_token')
    window.location.href = '/'
  }

  const onUserActivity = () => {
    lastActiveTime = Date.now()
  }

  // 监听用户操作
  const activityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart']
  activityEvents.forEach(evt => {
    window.addEventListener(evt, onUserActivity, { passive: true })
  })

  // 心跳：每30秒检查一次，更新 last_active_at 或自动离线
  heartbeatTimer = setInterval(() => {
    const now = Date.now()
    if (now - lastActiveTime > OFFLINE_THRESHOLD) {
      setOffline()
    } else {
      updateLastActive()
    }
  }, 30000)

  // 状态检查：每10秒刷新所有节点的状态显示
  statusCheckTimer = setInterval(() => {
    const now = Date.now()
    nodes.value = (nodes.value as any).map((n: any) => {
      if (n.id === authStore.currentUser?.id) {
        const newStatus: UserStatus = isAutoOffline ? 'offline' : (now - lastActiveTime < ACTIVE_THRESHOLD ? 'active' : 'online')
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
    activityEvents.forEach(evt => {
      window.removeEventListener(evt, onUserActivity)
    })
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (statusCheckTimer) clearInterval(statusCheckTimer)
    pb.collection('users').unsubscribe('*')
  })

  const availableTags = computed(() => {
    const tagSet = new Set<string>()
    ;(nodes.value as any).forEach((n: any) => {
      n.data.tags?.forEach((tag: string) => tagSet.add(tag))
    })
    return Array.from(tagSet)
  })

  const onNodesChange = (changes: NodeChange[]) => {
    const nextChanges = changes.filter((change) => change.type !== 'remove')
    applyNodeChanges(nextChanges)
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    const nextChanges = changes.filter((change) => {
      if (change.type === 'remove') {
        return change.id === selectedEdgeId.value
      }
      return true
    })
    applyEdgeChanges(nextChanges)
    if (nextChanges.some((c) => c.type === 'remove')) {
      selectedEdgeId.value = null
    }
  }

  const refreshPage = () => {
    window.location.reload()
  }

  const increasePopularity = async () => {
    if (!activeUser.value) return
    await updateStatsInDB(activeUser.value.id, 1, 1)
  }

  const decreasePopularity = async () => {
    if (!activeUser.value) return
    await updateStatsInDB(activeUser.value.id, -1, 1)
  }

  const updateStatsInDB = async (userId: string, popularityDelta: number, interactionDelta: number) => {
    try {
      const stat = await pb.collection('user_stats').getFirstListItem(`user_id="${userId}"`)
      const newPopularity = Math.max(0, (stat.popularity_score || 0) + popularityDelta)
      const newInteraction = Math.max(0, (stat.interaction_count || 0) + interactionDelta)

      await pb.collection('user_stats').update(stat.id, {
        popularity_score: newPopularity,
        interaction_count: newInteraction
      })

      nodes.value = (nodes.value as any).map((n: any) => {
        if (n.id === userId) {
          const updated = {
            ...n,
            data: {
              ...n.data,
              popularity: newPopularity,
              interaction: newInteraction
            }
          }
          if (activeUser.value?.id === userId) {
            activeUser.value = updated as any
          }
          return updated
        }
        return n
      })
    } catch (error) {
      console.error('更新统计数据失败:', error)
    }
  }

  const clearAllActive = () => {
    nodes.value = (nodes.value as any).map((n: any) => ({ ...n, selected: false }))
    edges.value = (edges.value as any).map((e: any) => ({
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

    nodes.value = (nodes.value as any).map((n: any) => ({
      ...n,
      selected: n.id === edge.source || n.id === edge.target
    }))

    edges.value = (edges.value as any).map((e: any) => ({
      ...e,
      animated: e.id === edge.id,
      style: {
        stroke: e.id === edge.id ? '#ff4d6d' : '#b1b1b7',
        strokeWidth: e.id === edge.id ? 3 : 1.5
      }
    }))
  }

  const handleConnect = (params: any) => {
    if (params.source === params.target) {
      throw new Error('节点不能连接自己')
    }

    const exists = (edges.value as any).some(
      (e: any) => (e.source === params.source && e.target === params.target) ||
              (e.source === params.target && e.target === params.source)
    )

    if (exists) {
      throw new Error('这两个节点已经连接了')
    }

    const newEdge: any = {
      id: `e${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      animated: true
    }
    edges.value = [...(edges.value as any), newEdge]
  }

  const highlightRelated = (nodeId: string) => {
    const relatedEdges = (edges.value as any).filter((e: any) => e.source === nodeId || e.target === nodeId)
    const relatedNodeIds = new Set<string>([nodeId])
    relatedEdges.forEach((e: any) => {
      relatedNodeIds.add(e.source)
      relatedNodeIds.add(e.target)
    })

    nodes.value = (nodes.value as any).map((n: any) => ({
      ...n,
      selected: relatedNodeIds.has(n.id)
    }))

    edges.value = (edges.value as any).map((e: any) => ({
      ...e,
      animated: relatedEdges.some((re: any) => re.id === e.id),
      style: {
        stroke: relatedEdges.some((re: any) => re.id === e.id) ? '#ff4d6d' : '#b1b1b7',
        strokeWidth: relatedEdges.some((re: any) => re.id === e.id) ? 3 : 1.5
      }
    }))
  }

  return {
    nodes,
    edges,
    selectedEdgeId,
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
    handleConnect
  }
}
