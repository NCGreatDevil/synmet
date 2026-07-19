import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
  const sendMatchmakingInvite = (
    matchmakerId: string,
    matchmakerName: string,
    userA: any,
    userB: any
  ) => {
    const applicationId = `app_${Date.now()}`
    const applyTime = new Date()

    // 创建牵线申请
    const application: MatchApplication = {
      id: applicationId,
      matchmakerId,
      matchmakerName,
      userA: {
        id: userA.id,
        name: userA.name,
        avatar: userA.avatar,
        gender: userA.gender,
        age: userA.age,
        bio: userA.bio,
        tags: userA.tags,
        status: 'pending'
      },
      userB: {
        id: userB.id,
        name: userB.name,
        avatar: userB.avatar,
        gender: userB.gender,
        age: userB.age,
        bio: userB.bio,
        tags: userB.tags,
        status: 'pending'
      },
      applicationStatus: 'pending',
      applyTime
    }

    applications.value.push(application)

    // 给用户A发送收件通知
    const notificationToA: Notification = {
      id: `notif_${Date.now()}_a`,
      senderId: matchmakerId,
      senderName: matchmakerName,
      userId: userA.id,
      type: 'matchmaking_invite',
      title: '红娘邀请',
      content: `${matchmakerName}邀请您参加匹配，点击进入匹配列表。`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    // 给用户B发送收件通知
    const notificationToB: Notification = {
      id: `notif_${Date.now()}_b`,
      senderId: matchmakerId,
      senderName: matchmakerName,
      userId: userB.id,
      type: 'matchmaking_invite',
      title: '红娘邀请',
      content: `${matchmakerName}邀请您参加匹配，点击进入匹配列表。`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    // 红娘发件箱：发给A的记录
    const sentToA: Notification = {
      id: `notif_${Date.now()}_sent_a`,
      senderId: matchmakerId,
      senderName: matchmakerName,
      userId: userA.id,
      type: 'matchmaking_invite',
      title: '红娘邀请',
      content: `你邀请${userA.name}参加匹配，点击进入匹配列表。`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    // 红娘发件箱：发给B的记录
    const sentToB: Notification = {
      id: `notif_${Date.now()}_sent_b`,
      senderId: matchmakerId,
      senderName: matchmakerName,
      userId: userB.id,
      type: 'matchmaking_invite',
      title: '红娘邀请',
      content: `你邀请${userB.name}参加匹配，点击进入匹配列表。`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    notifications.value.push(notificationToA, notificationToB, sentToA, sentToB)

    return applicationId
  }

  // 接受邀请（用户调用）
  const acceptInvitation = (applicationId: string, userId: string, userName: string) => {
    const application = applications.value.find(a => a.id === applicationId)
    if (!application) return

    // 更新用户状态
    if (application.userA.id === userId) {
      application.userA.status = 'accepted'
      application.userA.confirmTime = new Date()
    } else if (application.userB.id === userId) {
      application.userB.status = 'accepted'
      application.userB.confirmTime = new Date()
    }

    // 检查是否双方都已接受
    if (application.userA.status === 'accepted' && application.userB.status === 'accepted') {
      application.applicationStatus = 'confirmed'
    }

    // 给红娘发送通知
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      userId: application.matchmakerId,
      type: 'matchmaking_accepted',
      title: '匹配邀请已接受',
      content: `${userName}已接收匹配邀请`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    notifications.value.push(notification)
  }

  // 拒绝邀请（用户调用）
  const rejectInvitation = (applicationId: string, userId: string, userName: string) => {
    const application = applications.value.find(a => a.id === applicationId)
    if (!application) return

    // 更新用户状态
    if (application.userA.id === userId) {
      application.userA.status = 'rejected'
      application.userA.confirmTime = new Date()
    } else if (application.userB.id === userId) {
      application.userB.status = 'rejected'
      application.userB.confirmTime = new Date()
    }

    // 更新申请状态为已拒绝
    application.applicationStatus = 'rejected'

    // 给红娘发送通知
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      senderId: userId,
      senderName: userName,
      userId: application.matchmakerId,
      type: 'matchmaking_rejected',
      title: '匹配邀请已拒绝',
      content: `${userName}拒绝匹配邀请`,
      relatedApplicationId: applicationId,
      isRead: false,
      createdAt: new Date()
    }

    notifications.value.push(notification)
  }

  // 标记通知为已读
  const markAsRead = (notificationId: string) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
    }
  }

  // 获取用户的收件箱（userId 为当前用户的通知）
  const getInboxNotifications = (userId: string) => {
    return notifications.value.filter(n => n.userId === userId)
  }

  // 获取用户的发件箱（senderId 为当前用户的通知）
  const getSentNotifications = (userId: string) => {
    return notifications.value.filter(n => n.senderId === userId)
  }

  // 获取用户相关的牵线申请
  const getUserApplications = (userId: string, isMatchmaker: boolean) => {
    if (isMatchmaker) {
      // 红娘只看自己发起的邀请
      return applications.value.filter(a => a.matchmakerId === userId)
    }
    // 普通用户只看自己被邀请的匹配
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
    getInboxNotifications,
    getSentNotifications,
    getUserApplications,
    getApplicationById
  }
})
