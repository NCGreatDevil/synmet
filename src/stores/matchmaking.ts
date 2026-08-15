import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb, { getUserAvatarUrl } from '@/lib/pocketbase'
import { useAuthStore } from './auth'

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
  applicationStatus: 'pending' | 'confirmed' | 'disagreed' | 'both_rejected'
  applyTime: Date
}

// 通知数据结构
export interface Notification {
  id: string
  senderId: string          // 发件人ID
  senderName: string        // 发件人姓名
  userId: string            // 收件人ID
  userName: string          // 收件人姓名
  type: 'matchmaking_invite' | 'matchmaking_accepted' | 'matchmaking_rejected'
  title: string
  content: string
  relatedApplicationId: string  // 关联的牵线申请ID
  isRead: boolean
  createdAt: Date
}

// 通用数字到字符串映射工具函数
const mapNumberTo = <T>(num: number, mapping: Record<number, T>, fallback: T): T => {
  return mapping[num] ?? fallback
}

// 状态映射：数据库数字 <-> 前端字符串
const statusFromString = (num: number): 'pending' | 'accepted' | 'rejected' => {
  return mapNumberTo(num, {
    0: 'pending',
    1: 'accepted',
    2: 'rejected'
  }, 'pending')
}

const applicationStatusFromString = (num: number): 'pending' | 'confirmed' | 'disagreed' | 'both_rejected' => {
  return mapNumberTo(num, {
    0: 'pending',
    1: 'confirmed',
    3: 'disagreed',
    4: 'both_rejected'
  }, 'pending')
}

const notificationTypeFromString = (num: number): 'matchmaking_invite' | 'matchmaking_accepted' | 'matchmaking_rejected' => {
  return mapNumberTo(num, {
    0: 'matchmaking_invite',
    1: 'matchmaking_accepted',
    2: 'matchmaking_rejected'
  }, 'matchmaking_invite')
}

// 获取用户显示名称（优先级：username > name > email > fallback）
const pickDisplayName = (user: any, fallback: string): string => {
  return user?.username || user?.name || user?.email || fallback
}

// 批量获取用户标签（避免 N+1 查询）
const batchGetUserTags = async (userIds: string[]): Promise<Map<string, string[]>> => {
  if (userIds.length === 0) return new Map()
  try {
    const tags = await pb.collection('user_tags').getFullList({
      filter: userIds.map(id => `user_id = "${id}"`).join(' || ')
    })
    const tagMap = new Map<string, string[]>()
    for (const tag of tags) {
      if (!tagMap.has(tag.user_id)) {
        tagMap.set(tag.user_id, [])
      }
      tagMap.get(tag.user_id)!.push(tag.tag_name)
    }
    return tagMap
  } catch {
    return new Map(userIds.map(id => [id, []]))
  }
}

// 批量获取用户信息（避免 N+1 查询，替代 expand）
const batchGetUsers = async (userIds: string[]): Promise<Map<string, any>> => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()
  try {
    const filter = uniqueIds.map(id => `id = "${id}"`).join(' || ')
    const records = await pb.collection('users').getFullList({ filter })
    const userMap = new Map<string, any>()
    for (const record of records) {
      userMap.set(record.id, record)
    }
    return userMap
  } catch (error) {
    console.error('批量获取用户信息失败:', error)
    return new Map()
  }
}

// 转换数据库记录为前端接口
const convertApplication = async (
  record: any,
  tagMap: Map<string, string[]>,
  userMap: Map<string, any>
): Promise<MatchApplication> => {
  const matchmaker = userMap.get(record.matchmaker_id) || {}
  const userA = userMap.get(record.user_a_id) || {}
  const userB = userMap.get(record.user_b_id) || {}

  return {
    id: record.id,
    matchmakerId: record.matchmaker_id,
    matchmakerName: pickDisplayName(matchmaker, '红娘'),
    userA: {
      id: userA.id || record.user_a_id,
      name: pickDisplayName(userA, '用户A'),
      avatar: getUserAvatarUrl(userA),
      gender: userA.gender,
      age: userA.age,
      bio: userA.bio,
      tags: tagMap.get(record.user_a_id) || [],
      status: statusFromString(record.user_a_status),
      confirmTime: record.user_a_confirm_time ? new Date(record.user_a_confirm_time) : undefined
    },
    userB: {
      id: userB.id || record.user_b_id,
      name: pickDisplayName(userB, '用户B'),
      avatar: getUserAvatarUrl(userB),
      gender: userB.gender,
      age: userB.age,
      bio: userB.bio,
      tags: tagMap.get(record.user_b_id) || [],
      status: statusFromString(record.user_b_status),
      confirmTime: record.user_b_confirm_time ? new Date(record.user_b_confirm_time) : undefined
    },
    applicationStatus: applicationStatusFromString(record.application_status),
    applyTime: new Date(record.apply_time)
  }
}

// 转换通知记录（从 userMap 中获取发件人/收件人信息）
const convertNotification = (record: any, userMap: Map<string, any>): Notification => {
  const sender = userMap.get(record.sender_id) || {}
  const recipient = userMap.get(record.user_id) || {}

  return {
    id: record.id,
    senderId: record.sender_id,
    senderName: pickDisplayName(sender, '用户'),
    userId: record.user_id,
    userName: pickDisplayName(recipient, '用户'),
    type: notificationTypeFromString(record.notification_type),
    title: getNotificationTitle(record.notification_type),
    content: record.content,
    relatedApplicationId: record.related_id || '',
    isRead: record.is_read,
    // PocketBase 系统字段 created 可能缺失，做容错
    createdAt: record.created ? new Date(record.created) : new Date()
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

  // 计算未读通知数量（仅收件箱，发件箱不显示红点）
  const unreadCount = computed(() => {
    const authStore = useAuthStore()
    const currentUserId = authStore.currentUser?.id || ''
    return notifications.value.filter(n => !n.isRead && n.userId === currentUserId).length
  })

  // 发送匹配邀请
  const sendMatchmakingInvite = async (
    matchmakerId: string,
    matchmakerName: string,
    userA: any,
    userB: any
  ): Promise<string> => {
    try {
      // 确保 matchmakerId 是用户ID而不是邮箱
      if (matchmakerId.includes('@')) {
        console.error('错误：matchmakerId 应该是用户ID，而不是邮箱:', matchmakerId)
        throw new Error('matchmakerId 必须是用户ID，不能是邮箱')
      }

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

      // 只向被邀请双方各发 1 条通知（共 2 条）
      // sender_id = 红娘ID，user_id = 被邀请用户ID
      // 红娘发件箱通过 sender_id 过滤展示，被邀请用户收件箱通过 user_id 过滤展示
      // 不再单独为发件箱创建记录，避免数据冗余
      // 注意：必须顺序 await，不能用 Promise.all
      // PocketBase JS SDK 默认开启 autoCancellation，并发请求会互相取消导致 AbortError
      const now = new Date().toISOString()
      const inviteContent = `${matchmakerName}邀请您参加匹配，点击进入匹配列表。`
      const recipients = [userA, userB]
      for (const user of recipients) {
        await pb.collection('notifications').create({
          sender_id: matchmakerId,
          user_id: user.id,
          notification_type: 0,
          related_id: application.id,
          content: inviteContent,
          is_read: false,
          created: now,
          updated: now
        })
      }

      return application.id
    } catch (error) {
      console.error('发送匹配邀请失败:', error)
      throw error
    }
  }

  // 创建沟通会话和群组（双方都接受后调用）
  const createSessionAndGroups = async (application: any) => {
    try {
      // 获取用户信息（用于群名和系统消息）
      const userIds = [application.matchmaker_id, application.user_a_id, application.user_b_id]
      const userMap = await batchGetUsers(userIds)
      const userAName = pickDisplayName(userMap.get(application.user_a_id), '用户A')
      const userBName = pickDisplayName(userMap.get(application.user_b_id), '用户B')

      // 1. 创建沟通会话
      const session = await pb.collection('communication_sessions').create({
        application_id: application.id,
        user_a_id: application.user_a_id,
        user_b_id: application.user_b_id,
        main_matchmaker_id: application.matchmaker_id,
        session_status: 1,
        start_time: new Date().toISOString()
      })

      // 2. 创建大群（group_type=1）
      const groupName = `${userAName}与${userBName}的沟通群`
      const group = await pb.collection('chat_groups').create({
        session_id: session.id,
        group_name: groupName,
        group_type: 1,
        group_status: 1
      })

      // 3. 添加群成员（必须顺序 await，避免并发问题）
      const now = new Date().toISOString()
      // 红娘为群主
      await pb.collection('chat_group_members').create({
        group_id: group.id,
        user_id: application.matchmaker_id,
        member_role: 2,  // 群主
        join_time: now,
        is_active: 1
      })
      // 用户A为普通成员
      await pb.collection('chat_group_members').create({
        group_id: group.id,
        user_id: application.user_a_id,
        member_role: 1,  // 普通成员
        join_time: now,
        is_active: 1
      })
      // 用户B为普通成员
      await pb.collection('chat_group_members').create({
        group_id: group.id,
        user_id: application.user_b_id,
        member_role: 1,  // 普通成员
        join_time: now,
        is_active: 1
      })

      // 4. 发送群系统消息（灰色居中，message_type=5）
      // 为每个成员发送一条系统消息（这样每个人都能看到未读提示）
      const systemContent = '您已加入沟通群'
      const members = [application.matchmaker_id, application.user_a_id, application.user_b_id]
      for (const memberId of members) {
        await pb.collection('messages').create({
          group_id: group.id,
          sender_id: memberId,
          message_type: 6,  // 6=系统消息
          content: systemContent,
          is_read: false,
          send_time: now
        })
      }

      console.log('✅ 会话和群组创建成功:', { sessionId: session.id, groupId: group.id })
    } catch (error) {
      console.error('创建会话和群组失败:', error)
      throw error
    }
  }

  // 接受邀请（用户调用）
  // 逻辑：只更新当前用户的状态，application_status 在双方都操作后才更新
  // 双方都接受后，自动创建会话和群组
  const acceptInvitation = async (applicationId: string, userId: string, userName: string) => {
    try {
      // 获取申请记录
      const application = await pb.collection('matchmaker_applications').getOne(applicationId)

      // 更新当前用户状态为已接受
      const updateData: any = {}
      if (application.user_a_id === userId) {
        updateData.user_a_status = 1
        updateData.user_a_confirm_time = new Date().toISOString()
      } else if (application.user_b_id === userId) {
        updateData.user_b_status = 1
        updateData.user_b_confirm_time = new Date().toISOString()
      }

      // 计算双方最终状态
      const finalA = application.user_a_id === userId ? 1 : application.user_a_status
      const finalB = application.user_b_id === userId ? 1 : application.user_b_status

      // 只有双方都操作后才更新 application_status
      if (finalA !== 0 && finalB !== 0) {
        if (finalA === 1 && finalB === 1) {
          updateData.application_status = 1  // 双方已接受
        } else if (finalA === 2 && finalB === 2) {
          updateData.application_status = 4  // 双方已拒绝
        } else {
          updateData.application_status = 3  // 双方意见不一
        }
      }

      await pb.collection('matchmaker_applications').update(applicationId, updateData)

      // 给红娘发送通知
      const now1 = new Date().toISOString()
      await pb.collection('notifications').create({
        sender_id: userId,
        user_id: application.matchmaker_id,
        notification_type: 1,
        related_id: applicationId,
        content: `${userName}已接收匹配邀请`,
        is_read: false,
        created: now1,
        updated: now1
      })

      // 如果双方都接受了，创建会话和群组
      if (finalA === 1 && finalB === 1) {
        await createSessionAndGroups(application)
      }
    } catch (error) {
      console.error('接受邀请失败:', error)
      throw error
    }
  }

  // 拒绝邀请（用户调用）
  // 逻辑：只更新当前用户的状态为已拒绝，不立即更新 application_status
  // 另一方看不到拒绝状态，仍可正常操作；双方都操作后才更新 application_status
  const rejectInvitation = async (applicationId: string, userId: string, userName: string) => {
    try {
      // 获取申请记录
      const application = await pb.collection('matchmaker_applications').getOne(applicationId)

      // 只更新当前用户状态为已拒绝，不设置 application_status
      const updateData: any = {}
      if (application.user_a_id === userId) {
        updateData.user_a_status = 2
        updateData.user_a_confirm_time = new Date().toISOString()
      } else if (application.user_b_id === userId) {
        updateData.user_b_status = 2
        updateData.user_b_confirm_time = new Date().toISOString()
      }

      // 计算双方最终状态
      const finalA = application.user_a_id === userId ? 2 : application.user_a_status
      const finalB = application.user_b_id === userId ? 2 : application.user_b_status

      // 只有双方都操作后才更新 application_status
      if (finalA !== 0 && finalB !== 0) {
        if (finalA === 1 && finalB === 1) {
          updateData.application_status = 1  // 双方已接受
        } else if (finalA === 2 && finalB === 2) {
          updateData.application_status = 4  // 双方已拒绝
        } else {
          updateData.application_status = 3  // 双方意见不一
        }
      }

      await pb.collection('matchmaker_applications').update(applicationId, updateData)

      // 给红娘发送通知
      const now2 = new Date().toISOString()
      await pb.collection('notifications').create({
        sender_id: userId,
        user_id: application.matchmaker_id,
        notification_type: 2,
        related_id: applicationId,
        content: `${userName}拒绝匹配邀请`,
        is_read: false,
        created: now2,
        updated: now2
      })
    } catch (error) {
      console.error('拒绝邀请失败:', error)
      throw error
    }
  }

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      const now = new Date().toISOString()
      await pb.collection('notifications').update(notificationId, {
        is_read: true,
        read_time: now,
        updated: now
      })
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }

  // 加载用户的收件箱（清空旧数据后重新加载）
  const loadInboxNotifications = async (userId: string) => {
    try {
      const records = await pb.collection('notifications').getFullList({
        filter: `user_id = "${userId}"`,
        sort: '-id'
      })
      // 批量获取关联用户信息（替代 expand）
      const userIds = records.flatMap(r => [r.sender_id, r.user_id])
      const userMap = await batchGetUsers(userIds)
      const newItems = records.map(r => convertNotification(r, userMap))
      // 清空旧数据，直接替换（避免切换用户时数据残留）
      notifications.value = newItems
    } catch (error) {
      console.error('加载收件箱失败:', error)
    }
  }

  // 加载用户的发件箱（清空旧数据后重新加载）
  const loadSentNotifications = async (userId: string) => {
    try {
      const records = await pb.collection('notifications').getFullList({
        filter: `sender_id = "${userId}"`,
        sort: '-id'
      })
      // 批量获取关联用户信息（替代 expand）
      const userIds = records.flatMap(r => [r.sender_id, r.user_id])
      const userMap = await batchGetUsers(userIds)
      const newItems = records.map(r => convertNotification(r, userMap))
      // 清空旧数据，直接替换（避免切换用户时数据残留）
      notifications.value = newItems
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
        sort: '-apply_time'
      })

      // 批量获取所有用户ID（包括红娘、用户A、用户B）
      const allUserIds = records.flatMap(r => [r.matchmaker_id, r.user_a_id, r.user_b_id])
      
      // 批量获取用户信息和标签，避免 N+1 查询
      const [tagMap, userMap] = await Promise.all([
        batchGetUserTags(records.flatMap(r => [r.user_a_id, r.user_b_id])),
        batchGetUsers(allUserIds)
      ])

      applications.value = await Promise.all(
        records.map(r => convertApplication(r, tagMap, userMap))
      )
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
