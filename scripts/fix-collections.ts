import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fixCollections() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  console.log('开始修复集合字段...\n')

  // 1. 修复 user_login_logs - 添加 user_id
  console.log('=== 修复 user_login_logs ===')
  const llCol = await pb.collections.getOne('user_login_logs')
  const llFields = ((llCol as any).fields || []).filter((f: any) => !f.system)
  const llNames = llFields.map((f: any) => f.name)
  
  if (!llNames.includes('user_id')) {
    llFields.unshift({
      name: 'user_id',
      type: 'text',
      required: true,
      options: { max: 15 }
    })
    console.log('✓ 添加 user_id')
  }

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_login_logs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: llFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ user_login_logs 修复完成')
  })

  // 2. 修复 user_tags - 添加 user_id
  console.log('\n=== 修复 user_tags ===')
  const tagsCol = await pb.collections.getOne('user_tags')
  const tagsFields = ((tagsCol as any).fields || []).filter((f: any) => !f.system)
  const tagsNames = tagsFields.map((f: any) => f.name)
  
  if (!tagsNames.includes('user_id')) {
    tagsFields.unshift({
      name: 'user_id',
      type: 'text',
      required: true,
      options: { max: 15 }
    })
    console.log('✓ 添加 user_id')
  }

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_tags', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: tagsFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else console.log('✓ user_tags 修复完成')
  })

  // 3. 修复 users - 更新字段约束
  console.log('\n=== 修复 users 集合 ===')
  const usersCol = await pb.collections.getOne('_pb_users_auth_')
  const allFields = (usersCol as any).fields || []
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const updatedFields = customFields.map((f: any) => {
    if (f.name === 'gender') return { ...f, required: true, options: { min: 0, max: 2, default: 0 } }
    if (f.name === 'role') return { ...f, required: true, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'status') return { ...f, required: true, options: { min: 0, max: 1, default: 1 } }
    if (f.name === 'is_online') return { ...f, required: true, options: { min: 0, max: 1, default: 0 } }
    if (f.name === 'bio') return { ...f, options: { max: 500 } }
    return f
  })

  await fetch('https://synmet.ma.cloud-ip.cc/api/collections/_pb_users_auth_', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updatedFields })
  }).then(r => r.json()).then(d => {
    if (d.message) console.log('✗ error:', JSON.stringify(d.data, null, 2))
    else {
      console.log('✓ users 集合修复完成')
      const fields = d.fields.filter((f: any) => !f.system)
      console.log('字段:', fields.map((f: any) => f.name))
    }
  })

  console.log('\n========================================')
  console.log('修复完成！')
  console.log('========================================')
}

fixCollections().catch((error) => {
  console.error('修复失败:', error)
  process.exit(1)
})
