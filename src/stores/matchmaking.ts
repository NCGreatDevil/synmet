import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '@/lib/pocketbase'
import { getUserAvatarUrl } from '@/lib/pocketbase'

// 牵线申请数据结构
export interface MatchApplication {
  id: string
  matchmakerId: string      // 红娘ID
  matchmakerName: string    // 红娘姓名
  userA: {
    id: string
    name: string
    avatar: string
    gender?: number
    age?: number | null
    bio?: string
    tags?: string[]
    status: 'pending' | 'accepted' | 'rejected'  // 待确认/已接受/已拒绝
    confirmTime?: Date
  }
  userB: {
    id: string
    name: string
    avatar: string
    gender?: number
    age?: number | null
    bio?: string
    tags?: string[]
    status: 'pending' | 'accepted' | 'rejected'
    confirmTime?: Date
  }
  applicationStatus: 'pending' | 'confirmed' | 'rejected'
  applyTime: Date
}

// 通知数据结构
export interface Notification {
  id: string
  senderId: string          // 发件人ID
  senderName: string        // 发件人姓名
  userId: string            // 收件人ID
  type: 'matchmaking_invite' | 'matchmaking_accepted' | 'matchmaking_rejected'
  title: string
  content: string
  relatedApplicationId: string  // 关联的牵线申请ID
  isRead: boolean
  createdAt: Date
}

// 状态映射：数据库数字 <-> 前端字符串
const statusFromString = (num: number): 'pending' | 'accepted' | 'rejected' => {
  switch (num) {
    case 0: return 'pending'
    case 1: return 'accepted'
    case 2: return 'rejected'
    default: return 'pending'
  }
}

const applicationStatusFromString = (num: number): 'pending' | 'confirmed' | 'rejected' => {
  switch (num) {
    case 0: return 'pending'
    case 1: return 'confirmed'
    case 2: return 'rejected'
    default: return 'pending'
  }
}

const notificationTypeFromString = (num: number): 'matchmaking_invite' | 'matchmaking_accepted' | 'matchmaking_rejected' => {
  switch (num) {
    case 0: return 'matchmaking_invite'
    case 1: return 'matchmaking_accepted'
    case 2: return 'matchmaking_rejected'
    default: return 'matchmaking_invite'
  }
}

// 获取用户标签
const getUserTags = async (userId: string): Promise<string[]> => {
  try {
    const tags = await pb.collection('user_tags').getFullList({
      filter: `user_id = "${userId}"`
    })
    return tags.map(t => t.tag_name)
  } catch {
    return []
  }
}

// 转换数据库记录为前端接口
const convertApplication = async (record: any): Promise<MatchApplication> => {
  const expand = record.expand || {}
  const userA = expand.user_a_id || {}
  const userB = expand.user_b_id || {}
  const matchmaker = expand.matchmaker_id || {}

  const userATags = await getUserTags(userA.id)
  const userBTags = await getUserTags(userB.id)

  return {
    id: record.id,
    matchmakerId: record.matchmaker_id,
    matchmakerName: matchmaker.username || matchmaker.name || matchmaker.email || '红娘',
    userA: {
      id: userA.id,
      name: userA.username || userA.name || userA.email || '用户A',
      avatar: getUserAvatarUrl(userA),
      gender: userA.gender,
      age: userA.age,
      bio: userA.bio,
      tags: userATags,
      status: statusFromString(record.user_a_status),
      confirmTime: record.user_a_confirm_time ? new Date(record.user_a_confirm_time) : undefined
    },
    userB: {
      id: userB.id,
      name: userB.username || userB.name || userB.email || '用户B',
      avatar: getUserAvatarUrl(userB),
      gender: userB.gender,
      age: userB.age,
      bio: userB.bio,
      tags: userBTags,
      status: statusFromString(record.user_b_status),
      confirmTime: record.user_b_confirm_time ? new Date(record.user_b_confirm_time) : undefined
    },
    applicationStatus: applicationStatusFromString(record.application_status),
    applyTime: new Date(record.apply_time)
  }
}

// 转换通知记录
const convertNotification = (record: any): Notification => {
  const expand = record.expand || {}
  const sender = expand.sender_id || {}

  return {
    id: record.id,
    senderId: record.sender_id,
    senderName: sender.username || sender.name || sender.email || '用户',
    userId: record.user_id,
    type: notificationTypeFromString(record.notification_type),
    title: getNotificationTitle(record.notification_type),
    content: record.content,
    relatedApplicationId: record.related_id || '',
    isRead: record.is_read,
    createdAt: new Date(record.created)
  }
}

const getNotificationTitle = (type: number): string => {
  switch (type) {
    case 0: return '红娘邀请'
    case 1: return '匹配邀请已接受'
    case 2: return '匹配邀请已拒绝'
    default: return '通知'
  }
}

export const useMatchmakingStore = defineStore('matchmaking', () => {
  // 牵线申请列表
  const applications = ref<MatchApplication[]>([])

  // 通知列表
  const notifications = ref<Notification[]>([])

  // 计算未读通知数量（收件箱）
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.isRead).length
  })

  // 发送匹配邀请
  const sendMatchmakingInvite = async (
    matchmakerId: string,
    matchmakerName: string,
    userA: any,
    userB: any
  ): Promise<string> => {
    try {
      // 创建牵线申请
      const application = await pb.collection('matchmaker_applications').create({
        matchmaker_id: matchmakerId,
        user_a_id: userA.id,
        user_b_id: userB.id,
        user_a_status: 0,
        user_b_status: 0,
        application_status: 0,
        apply_time: new Date().toISOString()
      })

      // 给用户A发送收件通知
      await pb.collection('notifications').create({
        sender_id: matchmakerId,
        user_id: userA.id,
        notification_type: 0,
        related_id: application.id,
        content: `${matchmakerName}邀请您参加匹配，点击进入匹配列表。`,
        is_read: false
      })

      // 给用户B发送收件通知
      await pb.collection('notifications').create({
        sender_id: matchmakerId,
        user_id: userB.id,
        notification_type: 0,
        related_id: application.id,
        content: `${matchmakerName}邀请您参加匹配，点击进入匹配列表。`,
        is_read: false
      })

      // 红娘发件箱：发给A的记录
      await pb.collection('notifications').create({
        sender_id: matchmakerId,
        user_id: userA.id,
        notification_type: 0,
        related_id: application.id,
        content: `你邀请${userA.name}参加匹配，点击进入匹配列表。`,
        is_read: false
      })

      // 红娘发件箱：发给B的记录
      await pb.collection('notifications').create({
        sender_id: matchmakerId,
        user_id: userB.id,
        notification_type: 0,
        related_id: application.id,
        content: `你邀请${userB.name}参加匹配，点击进入匹配列表。`,
        is_read: false
      })

      return application.id
    } catch (error) {
      console.error('发送匹配邀请失败:', error)
      throw error
    }
  }

  // 接受邀请（用户调用）
  const acceptInvitation = async (applicationId: string, userId: string, userName: string) => {
    try {
      // 获取申请记录
      const application = await pb.collection('matchmaker_applications').getOne(applicationId)

      // 更新用户状态
      const updateData: any = {}
      if (application.user_a_id === userId) {
        updateData.user_a_status = 1
        updateData.user_a_confirm_time = new Date().toISOString()
      } else if (application.user_b_id === userId) {
        updateData.user_b_status = 1
        updateData.user_b_confirm_time = new Date().toISOString()
      }

      // 检查是否双方都已接受
      const newUserAStatus = application.user_a_id === userId ? 1 : application.user_a_status
      const newUserBStatus = application.user_b_id === userId ? 1 : application.user_b_status

      if (newUserAStatus === 1 && newUserBStatus === 1) {
        updateData.application_status = 1
      }

      await pb.collection('matchmaker_applications').update(applicationId, updateData)

      // 给红娘发送通知
      await pb.collection('notifications').create({
        sender_id: userId,
        user_id: application.matchmaker_id,
        notification_type: 1,
        related_id: applicationId,
        content: `${userName}已接收匹配邀请`,
        is_read: false
      })
    } catch (error) {
      console.error('接受邀请失败:', error)
      throw error
    }
  }

  // 拒绝邀请（用户调用）
  const rejectInvitation = async (applicationId: string, userId: string, userName: string) => {
    try {
      // 获取申请记录
      const application = await pb.collection('matchmaker_applications').getOne(applicationId)

      // 更新用户状态
      const updateData: any = {
        application_status: 2
      }

      if (application.user_a_id === userId) {
        updateData.user_a_status = 2
        updateData.user_a_confirm_time = new Date().toISOString()
      } else if (application.user_b_id === userId) {
        updateData.user_b_status = 2
        updateData.user_b_confirm_time = new Date().toISOString()
      }

      await pb.collection('matchmaker_applications').update(applicationId, updateData)

      // 给红娘发送通知
      await pb.collection('notifications').create({
        sender_id: userId,
        user_id: application.matchmaker_id,
        notification_type: 2,
        related_id: applicationId,
        content: `${userName}拒绝匹配邀请`,
        is_read: false
      })
    } catch (error) {
      console.error('拒绝邀请失败:', error)
      throw error
    }
  }

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      await pb.collection('notifications').update(notificationId, {
        is_read: true,
        read_time: new Date().toISOString()
      })
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }

  // 加载用户的收件箱
  const loadInboxNotifications = async (userId: string) => {
    try {
      const records = await pb.collection('notifications').getFullList({
        filter: `user_id = "${userId}"`,
        sort: '-created',
        expand: 'sender_id'
      })
      notifications.value = records.map(convertNotification)
    } catch (error) {
      console.error('加载收件箱失败:', error)
    }
  }

  // 加载用户的发件箱
  const loadSentNotifications = async (userId: string) => {
    try {
      const records = await pb.collection('notifications').getFullList({
        filter: `sender_id = "${userId}"`,
        sort: '-created',
        expand: 'sender_id'
      })
      notifications.value = records.map(convertNotification)
    } catch (error) {
      console.error('加载发件箱失败:', error)
    }
  }

  // 加载用户相关的牵线申请
  const loadUserApplications = async (userId: string, isMatchmaker: boolean) => {
    try {
      let filter = ''
      if (isMatchmaker) {
        // 红娘只看自己发起的邀请
        filter = `matchmaker_id = "${userId}"`
      } else {
        // 普通用户只看自己被邀请的匹配
        filter = `user_a_id = "${userId}" || user_b_id = "${userId}"`
      }

      const records = await pb.collection('matchmaker_applications').getFullList({
        filter,
        sort: '-apply_time',
        expand: 'matchmaker_id,user_a_id,user_b_id'
      })

      applications.value = await Promise.all(records.map(convertApplication))
    } catch (error) {
      console.error('加载牵线申请失败:', error)
    }
  }

  // 获取用户的收件箱（从已加载的数据中筛选）
  const getInboxNotifications = (userId: string) => {
    return notifications.value.filter(n => n.userId === userId)
  }

  // 获取用户的发件箱（从已加载的数据中筛选）
  const getSentNotifications = (userId: string) => {
    return notifications.value.filter(n => n.senderId === userId)
  }

  // 获取用户相关的牵线申请（从已加载的数据中筛选）
  const getUserApplications = (userId: string, isMatchmaker: boolean) => {
    if (isMatchmaker) {
      return applications.value.filter(a => a.matchmakerId === userId)
    }
    return applications.value.filter(a =>
      a.userA.id === userId || a.userB.id === userId
    )
  }

  // 根据ID获取牵线申请
  const getApplicationById = (applicationId: string) => {
    return applications.value.find(a => a.id === applicationId)
  }

  return {
    applications,
    notifications,
    unreadCount,
    sendMatchmakingInvite,
    acceptInvitation,
    rejectInvitation,
    markAsRead,
    loadInboxNotifications,
    loadSentNotifications,
    loadUserApplications,
    getInboxNotifications,
    getSentNotifications,
    getUserApplications,
    getApplicationById
  }
})
