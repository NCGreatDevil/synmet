import type { UserData } from '@/types'

export const userList: UserData[] = [
  { id: '1', name: '小明', avatar: 'https://randomuser.me/api/portraits/men/21.jpg', bio: '热爱旅行和摄影', tags: ['旅行', '摄影'], status: 'active', interaction: 128, popularity: 256 },
  { id: '2', name: '小红', avatar: 'https://randomuser.me/api/portraits/women/22.jpg', bio: '产品经理，咖啡爱好者', tags: ['产品', '咖啡'], status: 'online', interaction: 89, popularity: 178 },
  { id: '3', name: '阿杰', avatar: 'https://randomuser.me/api/portraits/men/23.jpg', bio: '全栈开发者', tags: ['开发', '开源'], status: 'active', interaction: 256, popularity: 512 },
  { id: '4', name: '莉莉', avatar: 'https://randomuser.me/api/portraits/women/24.jpg', bio: 'UI 设计师', tags: ['设计', '插画'], status: 'offline', interaction: 45, popularity: 92 },
  { id: '5', name: '大伟', avatar: 'https://randomuser.me/api/portraits/men/25.jpg', bio: '运营总监', tags: ['运营', '增长'], status: 'online', interaction: 167, popularity: 334 },
  { id: '6', name: '晓晓', avatar: 'https://randomuser.me/api/portraits/women/26.jpg', bio: '数据分析师', tags: ['数据', '分析'], status: 'offline', interaction: 67, popularity: 134 }
]

export const getAvailableTags = (users: UserData[]): string[] => {
  const tagSet = new Set<string>()
  users.forEach(user => {
    user.tags?.forEach(tag => tagSet.add(tag))
  })
  return Array.from(tagSet)
}
