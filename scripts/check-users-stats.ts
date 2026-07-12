import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function check() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 获取所有用户
  const users = await pb.collection('users').getFullList()
  console.log(`=== users 表: ${users.length} 条记录 ===`)
  const userIds = new Set<string>()
  for (const u of users) {
    userIds.add(u.id)
    console.log(`  ${u.id} | ${u.email} | username: ${u.username || '(空)'}`)
  }

  // 获取所有 user_stats
  const stats = await pb.collection('user_stats').getFullList()
  console.log(`\n=== user_stats 表: ${stats.length} 条记录 ===`)
  const statUserIds = new Set<string>()
  for (const s of stats) {
    statUserIds.add(s.user_id)
    console.log(`  user_id: ${s.user_id} | login_count: ${s.login_count} | interaction_count: ${s.interaction_count} | popularity_score: ${s.popularity_score}`)
  }

  // 检查不匹配
  console.log('\n=== 不匹配检查 ===')
  const usersWithoutStats = [...userIds].filter(id => !statUserIds.has(id))
  const statsWithoutUsers = [...statUserIds].filter(id => !userIds.has(id))

  if (usersWithoutStats.length > 0) {
    console.log(`\n有 ${usersWithoutStats.length} 个用户没有 user_stats 记录:`)
    for (const id of usersWithoutStats) {
      const u = users.find(u => u.id === id)
      console.log(`  ${id} | ${u?.email}`)
    }
  } else {
    console.log('\n所有用户都有 user_stats 记录')
  }

  if (statsWithoutUsers.length > 0) {
    console.log(`\n有 ${statsWithoutUsers.length} 条 user_stats 记录对应的用户不存在:`)
    for (const id of statsWithoutUsers) {
      console.log(`  ${id}`)
    }
  } else {
    console.log('所有 user_stats 记录都有对应的用户')
  }
}

check().catch(console.error)
