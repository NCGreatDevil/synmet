import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

const staticUsers = [
  { name: '小明', avatar: 'https://randomuser.me/api/portraits/men/21.jpg' },
  { name: '小红', avatar: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { name: '阿杰', avatar: 'https://randomuser.me/api/portraits/men/23.jpg' },
  { name: '莉莉', avatar: 'https://randomuser.me/api/portraits/women/24.jpg' },
  { name: '大伟', avatar: 'https://randomuser.me/api/portraits/men/25.jpg' },
  { name: '晓晓', avatar: 'https://randomuser.me/api/portraits/women/26.jpg' }
]

async function assign() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 获取所有用户，排除管理员
  const allUsers = await pb.collection('users').getFullList()
  const nonAdminUsers = allUsers.filter((u: any) => !u.is_admin)

  console.log(`非管理员用户: ${nonAdminUsers.length} 个`)
  console.log(`静态用户: ${staticUsers.length} 个\n`)

  if (nonAdminUsers.length !== staticUsers.length) {
    console.log('数量不匹配，按顺序赋值')
  }

  for (let i = 0; i < Math.min(nonAdminUsers.length, staticUsers.length); i++) {
    const dbUser = nonAdminUsers[i]
    const staticUser = staticUsers[i]
    console.log(`${dbUser.email} -> ${staticUser.name}`)
    await pb.collection('users').update(dbUser.id, {
      username: staticUser.name,
      avatar: staticUser.avatar
    })
  }

  console.log('\n赋值完成！')
}

assign().catch(console.error)
