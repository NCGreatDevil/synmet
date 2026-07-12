import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fix() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 查找 orphaned 记录
  const records = await pb.collection('user_stats').getFullList()
  for (const r of records) {
    if (r.user_id === '1l4x8mhww4tp7jo') {
      console.log('找到 orphaned 记录, ID:', r.id)
      await pb.collection('user_stats').delete(r.id)
      console.log('✓ 已删除')
      return
    }
  }
  console.log('未找到 orphaned 记录，可能已被删除')
}

fix().catch(console.error)
