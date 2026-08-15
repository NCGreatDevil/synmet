import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import pb from '@/lib/pocketbase'

// ======================== 类型定义 ========================

/** 群成员权限角色 */
export type MemberRole = 0 | 1 | 2  // 0-普通成员, 1-群主, 2-管理员

/** 成员关系标签（用于界面展示区分） */
export type RelationTag = 'main' | 'external'  // main-主角, external-外部人员

/** 群成员 */
export interface ChatMember {
  id: string
  userId: string
  userName: string
  avatar: string
  memberRole: MemberRole       // 权限角色
  relationTag?: RelationTag    // 关系标签（仅普通成员需要区分）
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  groupId: string
  senderId: string
  senderName: string
  senderAvatar: string
  messageType: number          // 1-文本, 2-图片, 3-语音, 4-视频, 5-文件, 6-系统消息
  content: string
  sendTime: Date
  isRead: boolean
}

/** 聊天群组 */
export interface ChatGroup {
  id: string
  name: string
  notice: string               // 群公告
  members: ChatMember[]
  messages: ChatMessage[]
  lastMessage?: ChatMessage    // 最后一条消息（computed）
  unreadCount: number          // 未读消息数
}

// ======================== Store ========================

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()

  // 聊天群组列表
  const groups = ref<ChatGroup[]>([])

  // 当前打开的聊天窗口
  const currentGroupId = ref<string | null>(null)

  // 轮询定时器
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const POLL_INTERVAL_IDLE = 30000 // 30秒（未打开对话框）
  const POLL_INTERVAL_ACTIVE = 5000 // 5秒（打开对话框）

  // 当前群组（computed）
  const currentGroup = computed(() => {
    if (!currentGroupId.value) return null
    return groups.value.find(g => g.id === currentGroupId.value) || null
  })

  // 当前群组的成员（按角色排序：群主 → 管理员 → 主角 → 外部人员）
  const sortedMembers = computed(() => {
    const group = currentGroup.value
    if (!group) return []
    return [...group.members].sort((a, b) => {
      // 先按 memberRole 排序（1-群主, 2-管理员, 0-普通成员）
      const roleOrder: Record<number, number> = { 1: 0, 2: 1, 0: 2 }
      const roleDiff = (roleOrder[a.memberRole] ?? 2) - (roleOrder[b.memberRole] ?? 2)
      if (roleDiff !== 0) return roleDiff
      // 普通成员内部：主角排在外部人员前面
      if (a.memberRole === 0 && b.memberRole === 0) {
        const tagOrder: Record<string, number> = { main: 0, external: 1 }
        return (tagOrder[a.relationTag ?? 'external'] ?? 1) - (tagOrder[b.relationTag ?? 'external'] ?? 1)
      }
      return 0
    })
  })

  // 当前用户是否是群主
  const isGroupOwner = computed(() => {
    const group = currentGroup.value
    if (!group) return false
    const currentUserId = authStore.currentUser?.id || ''
    const member = group.members.find(m => m.userId === currentUserId)
    return member?.memberRole === 1
  })

  // 总未读数（所有群组未读数之和）
  const totalUnreadCount = computed(() => {
    return groups.value.reduce((sum, g) => sum + g.unreadCount, 0)
  })

  // 加载当前用户所属的群组列表
  const loadUserGroups = async () => {
    const currentUserId = authStore.currentUser?.id
    if (!currentUserId) return

    try {
      // 查询当前用户作为成员的群组
      const memberRecords = await pb.collection('chat_group_members').getFullList({
        filter: `user_id = "${currentUserId}" && is_active = 1`,
        sort: '-join_time'
      })

      if (memberRecords.length === 0) {
        groups.value = []
        return
      }

      // 获取群组详情
      const groupIds = memberRecords.map(m => m.group_id)
      const filter = groupIds.map(id => `id = "${id}"`).join(' || ')
      const groupRecords = await pb.collection('chat_groups').getFullList({
        filter,
        sort: '-id'
      })

      // 获取每个群组的成员和最后一条消息
      const groupsData: ChatGroup[] = []
      for (const groupRecord of groupRecords) {
        // 获取群成员
        const memberRecords = await pb.collection('chat_group_members').getFullList({
          filter: `group_id = "${groupRecord.id}" && is_active = 1`
        })

        // 批量获取用户信息
        const userIds = memberRecords.map(m => m.user_id)
        const userFilter = userIds.map(id => `id = "${id}"`).join(' || ')
        const userRecords = userIds.length > 0 ? await pb.collection('users').getFullList({ filter: userFilter }) : []
        const userMap = new Map(userRecords.map(u => [u.id, u]))

        // 获取会话信息以确定主角
        const session = await pb.collection('communication_sessions').getOne(groupRecord.session_id)

        // 构建成员列表
        const members: ChatMember[] = memberRecords.map(m => {
          const user = userMap.get(m.user_id)
          const isMainCharacter = m.user_id === session.user_a_id || m.user_id === session.user_b_id
          return {
            id: m.id,
            userId: m.user_id,
            userName: user?.username || user?.name || '未知用户',
            avatar: user?.avatar || '',
            memberRole: m.member_role as MemberRole,
            relationTag: m.member_role === 1 ? (isMainCharacter ? 'main' : 'external') : undefined
          }
        })

        // 获取最后一条消息
        const lastMessageRecords = await pb.collection('messages').getList(1, 1, {
          filter: `group_id = "${groupRecord.id}"`,
          sort: '-send_time'
        })

        let lastMessage: ChatMessage | undefined
        if (lastMessageRecords.items.length > 0) {
          const msg = lastMessageRecords.items[0]
          const sender = userMap.get(msg.sender_id)
          lastMessage = {
            id: msg.id,
            groupId: msg.group_id,
            senderId: msg.sender_id,
            senderName: sender?.username || sender?.name || '未知用户',
            senderAvatar: sender?.avatar || '',
            messageType: msg.message_type,
            content: msg.content,
            sendTime: new Date(msg.send_time),
            isRead: msg.is_read
          }
        }

        // 统计未读消息数
        const unreadRecords = await pb.collection('messages').getFullList({
          filter: `group_id = "${groupRecord.id}" && is_read = false`
        })

        groupsData.push({
          id: groupRecord.id,
          name: groupRecord.group_name,
          notice: groupRecord.notice || '',
          members,
          messages: [],
          lastMessage,
          unreadCount: unreadRecords.length
        })
      }

      groups.value = groupsData
      
      // 加载完成后启动轮询
      startPolling()
    } catch (error) {
      console.error('加载群组列表失败:', error)
    }
  }

  // 加载指定群组的消息
  const loadGroupMessages = async (groupId: string) => {
    try {
      const messageRecords = await pb.collection('messages').getFullList({
        filter: `group_id = "${groupId}"`,
        sort: 'send_time'
      })

      // 批量获取发送者信息
      const senderIds = [...new Set(messageRecords.map(m => m.sender_id))]
      const userFilter = senderIds.map(id => `id = "${id}"`).join(' || ')
      const userRecords = senderIds.length > 0 ? await pb.collection('users').getFullList({ filter: userFilter }) : []
      const userMap = new Map(userRecords.map(u => [u.id, u]))

      const messages: ChatMessage[] = messageRecords.map(msg => {
        const sender = userMap.get(msg.sender_id)
        return {
          id: msg.id,
          groupId: msg.group_id,
          senderId: msg.sender_id,
          senderName: sender?.username || sender?.name || '未知用户',
          senderAvatar: sender?.avatar || '',
          messageType: msg.message_type,
          content: msg.content,
          sendTime: new Date(msg.send_time),
          isRead: msg.is_read
        }
      })

      const group = groups.value.find(g => g.id === groupId)
      if (group) {
        group.messages = messages
      }
    } catch (error) {
      console.error('加载群消息失败:', error)
    }
  }

  // 打开聊天窗口
  const openChat = async (groupId: string) => {
    currentGroupId.value = groupId
    // 加载消息
    await loadGroupMessages(groupId)
    // 清除未读数
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.unreadCount = 0
      group.messages.forEach(m => { m.isRead = true })
      // 标记数据库中的消息为已读
      try {
        const unreadRecords = await pb.collection('messages').getFullList({
          filter: `group_id = "${groupId}" && is_read = false`
        })
        for (const msg of unreadRecords) {
          await pb.collection('messages').update(msg.id, { is_read: true })
        }
      } catch (error) {
        console.error('标记消息已读失败:', error)
      }
    }
    // 切换到高频轮询（5秒）
    startPolling()
  }

  // 关闭聊天窗口
  const closeChat = () => {
    currentGroupId.value = null
    // 切换到低频轮询（30秒）
    startPolling()
  }

  // 发送消息
  const sendMessage = async (content: string) => {
    const group = currentGroup.value
    if (!group || !content.trim()) return

    const currentUser = authStore.currentUser
    if (!currentUser) return

    try {
      // 写入数据库
      const messageRecord = await pb.collection('messages').create({
        group_id: group.id,
        sender_id: currentUser.id,
        message_type: 1,  // 1=文本消息
        content: content.trim(),
        is_read: false,
        send_time: new Date().toISOString()
      })

      // 添加到本地消息列表
      const msg: ChatMessage = {
        id: messageRecord.id,
        groupId: group.id,
        senderId: currentUser.id,
        senderName: currentUser.username || currentUser.name || '我',
        senderAvatar: currentUser.avatar || '',
        messageType: 1,  // 1=文本消息
        content: content.trim(),
        sendTime: new Date(),
        isRead: true,
      }
      group.messages.push(msg)
      group.lastMessage = msg
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 轮询拉取新消息
  const pollNewMessages = async () => {
    const currentUserId = authStore.currentUser?.id
    if (!currentUserId) return

    try {
      // 遍历所有群组，拉取新消息
      for (const group of groups.value) {
        // 获取该群组的新消息
        const messageRecords = await pb.collection('messages').getFullList({
          filter: `group_id = "${group.id}"`,
          sort: 'send_time'
        })

        // 批量获取发送者信息
        const senderIds = [...new Set(messageRecords.map(m => m.sender_id))]
        const userFilter = senderIds.map(id => `id = "${id}"`).join(' || ')
        const userRecords = senderIds.length > 0 ? await pb.collection('users').getFullList({ filter: userFilter }) : []
        const userMap = new Map(userRecords.map(u => [u.id, u]))

        const messages: ChatMessage[] = messageRecords.map(msg => {
          const sender = userMap.get(msg.sender_id)
          return {
            id: msg.id,
            groupId: msg.group_id,
            senderId: msg.sender_id,
            senderName: sender?.username || sender?.name || '未知用户',
            senderAvatar: sender?.avatar || '',
            messageType: msg.message_type,
            content: msg.content,
            sendTime: new Date(msg.send_time),
            isRead: msg.is_read
          }
        })

        // 更新消息列表
        group.messages = messages

        // 更新最后一条消息
        if (messages.length > 0) {
          group.lastMessage = messages[messages.length - 1]
        }

        // 如果当前没有打开这个聊天窗口，更新未读数
        if (currentGroupId.value !== group.id) {
          const unreadCount = messages.filter(m => !m.isRead && m.senderId !== currentUserId).length
          group.unreadCount = unreadCount
        }
      }
    } catch (error) {
      console.error('轮询消息失败:', error)
    }
  }

  // 启动轮询
  const startPolling = () => {
    // 先停止已有的轮询
    stopPolling()

    // 根据当前状态决定轮询间隔
    const interval = currentGroupId.value ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE

    // 立即执行一次
    pollNewMessages()

    // 启动定时器
    pollTimer = setInterval(() => {
      pollNewMessages()
    }, interval)
  }

  // 停止轮询
  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // 编辑群公告
  const updateNotice = async (notice: string) => {
    const group = currentGroup.value
    if (!group || !isGroupOwner.value) return

    try {
      await pb.collection('chat_groups').update(group.id, {
        notice: notice
      })
      group.notice = notice
    } catch (error) {
      console.error('更新群公告失败:', error)
    }
  }

  return {
    groups,
    currentGroupId,
    currentGroup,
    sortedMembers,
    isGroupOwner,
    totalUnreadCount,
    loadUserGroups,
    loadGroupMessages,
    openChat,
    closeChat,
    sendMessage,
    updateNotice,
    startPolling,
    stopPolling,
  }
})
