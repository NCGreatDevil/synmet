import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fix() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  // 第一步：先把所有字段设为非必填
  console.log('=== 第一步：取消必填约束 ===\n')
  const usersCol = await pb.collections.getOne('_pb_users_auth_')
  const allFields = (usersCol as any).fields || []
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const nonRequiredFields = customFields.map((f: any) => ({ ...f, required: false }))

  const res1 = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: nonRequiredFields })
  })
  const data1 = await res1.json()
  if (res1.ok) {
    console.log('✓ 所有字段已设为非必填')
  } else {
    console.log('✗ error:', JSON.stringify(data1.data, null, 2))
    return
  }

  // 第二步：补全用户数据
  console.log('\n=== 第二步：补全用户数据 ===\n')
  const users = await pb.collection('users').getFullList()
  console.log(`找到 ${users.length} 个用户`)

  for (const user of users) {
    const u = user as any
    const updates: Record<string, any> = {}

    if (!u.username) {
      updates.username = u.name || u.email?.split('@')[0] || `user_${u.id}`
    }
    if (u.role === null || u.role === undefined) updates.role = 0
    if (u.status === null || u.status === undefined) updates.status = 1
    if (u.is_online === null || u.is_online === undefined) updates.is_online = 0
    if (u.is_admin === null || u.is_admin === undefined) updates.is_admin = false
    if (u.gender === null || u.gender === undefined) updates.gender = 0

    if (Object.keys(updates).length > 0) {
      await pb.collection('users').update(u.id, updates)
      console.log(`✓ ${u.email} -> ${JSON.stringify(updates)}`)
    } else {
      console.log(`- ${u.email} (无需更新)`)
    }
  }

  // 第三步：重新设置字段约束（数字字段不设 required，因为 PB 把 0 当空白）
  console.log('\n=== 第三步：设置字段约束 ===\n')
  const col2 = await pb.collections.getOne('_pb_users_auth_')
  const fields2 = ((col2 as any).fields || []).filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const finalFields = fields2.map((f: any) => {
    if (f.name === 'gender') return { ...f, required: false, options: { min: 0, max: 2, default: 0 } }
    if (f.name === 'role') return { ...f, required: false, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'status') return { ...f, required: false, options: { min: 0, max: 1, default: 1 } }
    if (f.name === 'is_online') return { ...f, required: false, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'is_admin') return { ...f, required: false, options: { default: false } }
    if (f.name === 'bio') return { ...f, options: { max: 500 } }
    if (f.name === 'username') return { ...f, required: true, options: { max: 50 } }
    return f
  })

  const res2 = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: finalFields })
  })
  const data2 = await res2.json()
  if (res2.ok) {
    console.log('✓ 字段约束设置完成')
  } else {
    console.log('✗ error:', JSON.stringify(data2.data, null, 2))
  }

  console.log('\n=== 完成 ===')
}

fix().catch((error) => {
  console.error('修复失败:', error)
  process.exit(1)
})
