import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function addTimestamps() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  // 获取当前字段
  const usersCol = await pb.collections.getOne('_pb_users_auth_')
  const allFields = (usersCol as any).fields || []
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  // 添加 created_at 和 updated_at 字段
  const newFields = [
    ...customFields,
    {
      name: 'created_at',
      type: 'date',
      required: false,
      options: {}
    },
    {
      name: 'updated_at',
      type: 'date',
      required: false,
      options: {}
    }
  ]

  const res = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: newFields })
  })
  const data = await res.json()
  if (res.ok) {
    console.log('✓ 已添加 created_at 和 updated_at 字段')
  } else {
    console.log('✗ error:', JSON.stringify(data.data, null, 2))
    return
  }

  // 给现有用户补上时间戳
  console.log('\n=== 补全现有用户时间戳 ===')
  const users = await pb.collection('users').getFullList()
  const now = new Date().toISOString()

  for (const user of users) {
    const u = user as any
    if (!u.created_at) {
      await pb.collection('users').update(u.id, {
        created_at: now,
        updated_at: now
      })
      console.log(`✓ ${u.email}`)
    }
  }

  console.log('\n完成！')
}

addTimestamps().catch((error) => {
  console.error('失败:', error)
  process.exit(1)
})
