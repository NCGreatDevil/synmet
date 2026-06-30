import { ref, computed } from 'vue'
import { useVueFlow, type Node, type Edge, type NodeChange, type EdgeChange } from '@vue-flow/core'
import type { UserData } from '@/types'
import { userList } from '@/data/users'

export function useGraph() {
  const { applyNodeChanges, applyEdgeChanges } = useVueFlow()
  const selectedEdgeId = ref<string | null>(null)
  const activeUser = ref<Node | null>(null)
  const isEditing = ref(false)
  const editForm = ref({
    name: '',
    bio: '',
    selectedTags: [] as string[]
  })

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

  const positions = generateRandomPositions(userList.length)
  const nodes = ref<Node[]>(userList.map((user, index) => ({
    id: user.id,
    type: 'userNode',
    position: positions[index],
    data: user,
    selected: false
  })))

  const edges = ref<Edge[]>([
    { id: 'e1-2', source: '1', target: '2', sourceHandle: '1-bottom', targetHandle: '2-top' },
    { id: 'e1-3', source: '1', target: '3', sourceHandle: '1-right', targetHandle: '3-left' },
    { id: 'e2-4', source: '2', target: '4', sourceHandle: '2-bottom', targetHandle: '4-top' },
    { id: 'e3-5', source: '3', target: '5', sourceHandle: '3-bottom', targetHandle: '5-top' },
    { id: 'e4-6', source: '4', target: '6', sourceHandle: '4-right', targetHandle: '6-left' }
  ])

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

  const toggleTag = (tag: string, maxCount: number = 3) => {
    const index = editForm.value.selectedTags.indexOf(tag)
    if (index > -1) {
      editForm.value.selectedTags.splice(index, 1)
    } else if (editForm.value.selectedTags.length < maxCount) {
      editForm.value.selectedTags.push(tag)
    }
    return editForm.value.selectedTags.length < maxCount
  }

  const startEditing = () => {
    if (!activeUser.value) return
    const data = activeUser.value.data as UserData
    editForm.value = {
      name: data.name || '',
      bio: data.bio || '',
      selectedTags: [...(data.tags || [])]
    }
    isEditing.value = true
  }

  const increasePopularity = () => {
    if (!activeUser.value) return
    updateUserStats(activeUser.value.id, 1, 1)
  }

  const decreasePopularity = () => {
    if (!activeUser.value) return
    updateUserStats(activeUser.value.id, -1, 1)
  }

  const updateUserStats = (userId: string, popularityDelta: number, interactionDelta: number) => {
    nodes.value = (nodes.value as any).map((n: any) => {
      if (n.id === userId) {
        const updatedNode = {
          ...n,
          data: {
            ...n.data,
            popularity: (n.data.popularity || 0) + popularityDelta,
            interaction: (n.data.interaction || 0) + interactionDelta
          }
        }
        activeUser.value = updatedNode as any
        return updatedNode
      }
      return n
    })
  }

  const saveEdit = () => {
    if (!activeUser.value) return

    const newTags = [...editForm.value.selectedTags]

    activeUser.value.data.name = editForm.value.name
    activeUser.value.data.bio = editForm.value.bio
    activeUser.value.data.tags = newTags

    nodes.value = (nodes.value as any).map((n: any) => {
      if (n.id === activeUser.value!.id) {
        return {
          ...n,
          data: {
            ...n.data,
            name: editForm.value.name,
            bio: editForm.value.bio,
            tags: newTags
          }
        }
      }
      return n
    })

    isEditing.value = false
    return true
  }

  const cancelEdit = () => {
    isEditing.value = false
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
    isEditing.value = false
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
    isEditing,
    editForm,
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
  }
}
