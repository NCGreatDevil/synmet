import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fix() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 1. 删除 orphaned 记录
  console.log('=== 删除 orphaned 记录 ===')
  try {
    await pb.collection('user_stats').delete('1l4x8mhww4tp7jo')
    console.log('✓ 删除 user_stats 1l4x8mhww4tp7jo (用户已不存在)')
  } catch (e: any) {
    console.log(' 删除失败:', e.message)
  }

  // 2. 为缺失的用户创建 user_stats
  console.log('\n=== 补建缺失的 user_stats ===')
  const missingUsers = [
    { id: 'yk3fxrpyd811ayb', email: 'test2@example.com' },
    { id: 'tevp97aiux3l68i', email: 'test1@example.com' }
  ]

  for (const u of missingUsers) {
    try {
      await pb.collection('user_stats').create({
        user_id: u.id,
        login_count: 0,
        interaction_count: 0,
        popularity_score: 0
      })
      console.log(`✓ 为 ${u.email} (${u.id}) 创建 user_stats`)
    } catch (e: any) {
      console.log(`✗ ${u.email} 创建失败:`, e.message)
    }
  }

  console.log('\n修复完成！')
}

fix().catch(console.error)
