import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fixSchema() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  console.log('开始修复数据库结构...\n')

  // 获取 users 集合 ID
  const allCollections = await pb.collections.getList(1, 100)
  const usersColInfo = allCollections.items.find(c => c.name === 'users')
  if (!usersColInfo) {
    console.error('users collection not found')
    process.exit(1)
  }
  const usersCollectionId = usersColInfo.id
  console.log('users collection ID:', usersCollectionId)

  // 1. 修复 users 表
  console.log('\n=== 修复 users 表 ===')
  const usersCol = await pb.collections.getOne('_pb_users_auth_')
  const allFields = (usersCol as any).fields || []
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const updatedUsersFields = customFields.map((f: any) => {
    if (f.name === 'gender') return { ...f, required: true, options: { min: 0, max: 2, default: 0 } }
    if (f.name === 'role') return { ...f, required: true, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'status') return { ...f, required: true, options: { min: 0, max: 1, default: 1 } }
    if (f.name === 'is_online') return { ...f, required: true, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'is_admin') return { ...f, required: true, options: { default: false } }
    if (f.name === 'bio') return { ...f, options: { max: 500 } }
    return f
  })

  // 添加 username 字段
  const existingNames = updatedUsersFields.map((f: any) => f.name)
  if (!existingNames.includes('username')) {
    updatedUsersFields.push({
      name: 'username',
      type: 'text',
      required: true,
      options: { max: 50 }
    })
    console.log('✓ 添加 username 字段')
  }

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedUsersFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ users 表修复完成')
  })

  // 2. 修复 user_login_logs 表
  console.log('\n=== 修复 user_login_logs 表 ===')
  const llCol = await pb.collections.getOne('user_login_logs')
  const llFields = ((llCol as any).fields || []).filter((f: any) => !f.system)

  const updatedLLFields = llFields.map((f: any) => {
    if (f.name === 'login_ip') return { ...f, options: { max: 50 } }
    if (f.name === 'device_type') return { ...f, options: { max: 50 } }
    if (f.name === 'device_info') return { ...f, options: { max: 255 } }
    return f
  })

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_login_logs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedLLFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ user_login_logs 表修复完成')
  })

  // 3. 修复 user_tags 表
  console.log('\n=== 修复 user_tags 表 ===')
  const tagsCol = await pb.collections.getOne('user_tags')
  const tagsFields = ((tagsCol as any).fields || []).filter((f: any) => !f.system)

  const updatedTagsFields = tagsFields.map((f: any) => {
    if (f.name === 'tag_name') return { ...f, options: { max: 50 } }
    if (f.name === 'tag_type') return { ...f, options: { min: 0, max: 1, default: 0 } }
    return f
  })

  // 添加 created_at 字段
  const tagsNames = updatedTagsFields.map((f: any) => f.name)
  if (!tagsNames.includes('created_at')) {
    updatedTagsFields.push({
      name: 'created_at',
      type: 'date',
      required: false
    })
    console.log('✓ 添加 created_at 字段')
  }

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_tags', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedTagsFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ user_tags 表修复完成')
  })

  // 4. 修复 user_stats 表
  console.log('\n=== 修复 user_stats 表 ===')
  const statsCol = await pb.collections.getOne('user_stats')
  const statsFields = ((statsCol as any).fields || []).filter((f: any) => !f.system)

  const updatedStatsFields = statsFields.map((f: any) => {
    if (['login_count', 'interaction_count', 'popularity_score'].includes(f.name)) {
      return { ...f, options: { min: 0, default: 0 } }
    }
    return f
  })

  // 添加 created_at 和 updated_at 字段
  const statsNames = updatedStatsFields.map((f: any) => f.name)
  if (!statsNames.includes('created_at')) {
    updatedStatsFields.push({
      name: 'created_at',
      type: 'date',
      required: false
    })
    console.log('✓ 添加 created_at 字段')
  }
  if (!statsNames.includes('updated_at')) {
    updatedStatsFields.push({
      name: 'updated_at',
      type: 'date',
      required: false
    })
    console.log('✓ 添加 updated_at 字段')
  }

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_stats', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedStatsFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ user_stats 表修复完成')
  })

  console.log('\n========================================')
  console.log('修复完成！')
  console.log('========================================')
  console.log('\n注意：')
  console.log('- PocketBase 的 auth 集合不支持 relation 字段指向自身')
  console.log('- current_partner_id 和 main_matchmaker_id 使用 text 类型存储用户 ID')
  console.log('- 其他表的 user_id 也使用 text 类型存储用户 ID')
  console.log('- 这是 PocketBase 的限制，需要在应用层处理关联关系')
}

fixSchema().catch((error) => {
  console.error('修复失败:', error)
  process.exit(1)
})
