import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fix() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  // 1. 把必填字段改为非必填（PocketBase 把 0 和 "" 当作空白）
  console.log('=== 修复字段约束 ===')
  const usersCol = await pb.collections.getOne('_pb_users_auth_')
  const allFields = (usersCol as any).fields || []
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const updatedFields = customFields.map((f: any) => {
    // 这些字段有默认值，不需要 required
    if (['gender', 'role', 'status', 'is_online', 'is_admin', 'username'].includes(f.name)) {
      return { ...f, required: false }
    }
    return f
  })

  const res = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedFields })
  })
  const data = await res.json()
  if (res.ok) {
    console.log('✓ 字段约束修复完成')
  } else {
    console.log('✗ error:', JSON.stringify(data.data, null, 2))
    return
  }

  // 2. 给所有用户补上 username 默认值
  console.log('\n=== 补全 username ===')
  const users = await pb.collection('users').getFullList()
  for (const user of users) {
    const u = user as any
    if (!u.username) {
      const defaultUsername = u.name || u.email?.split('@')[0] || `user_${u.id}`
      await pb.collection('users').update(u.id, { username: defaultUsername })
      console.log(`✓ ${u.email} -> username: ${defaultUsername}`)
    }
  }

  console.log('\n完成！')
}
fix()
