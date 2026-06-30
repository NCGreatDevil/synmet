export type UserStatus = 'active' | 'online' | 'offline'

export interface UserData {
  id: string
  name: string
  avatar: string
  bio: string
  tags: string[]
  status: UserStatus
  interaction: number
  popularity: number
}

export interface EditForm {
  name: string
  bio: string
  selectedTags: string[]
}

export interface MenuItem {
  label: string
  key: string
}
