import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fixUsers() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 获取所有集合的完整信息
  const allCollections = await pb.collections.getList(1, 100)
  for (const c of allCollections.items) {
    console.log('name:', c.name, '| id:', c.id)
  }

  // 找到 users 集合
  const usersCol = allCollections.items.find(c => c.name === 'users')
  if (!usersCol) {
    console.log('users not found')
    return
  }

  console.log('\nusers collection id:', usersCol.id)

  // 获取完整字段信息
  const fullCol = await pb.collections.getOne(usersCol.id)
  const allFields = (fullCol as any).fields || []
  console.log('\nall fields:')
  for (const f of allFields) {
    console.log('  -', f.name, '| system:', f.system, '| type:', f.type)
  }

  // 构建新字段列表（排除系统字段和内置字段）
  const customFields = allFields.filter((f: any) =>
    !f.system && !['name', 'avatar', 'created', 'updated'].includes(f.name)
  )

  const newFields = [...customFields]
  newFields.push({
    name: 'current_partner_id',
    type: 'relation',
    required: false,
    options: {
      collectionId: usersCol.id,
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1
    }
  })

  console.log('\n尝试更新，使用 collectionId:', usersCol.id)

  try {
    await pb.collections.update(usersCol.id, { fields: newFields })
    console.log('✓ users 集合更新成功')

    // 验证
    const updatedCol = await pb.collections.getOne(usersCol.id)
    const updatedFields = (updatedCol as any).fields.filter((f: any) => !f.system)
    console.log('更新后字段:', updatedFields.map((f: any) => f.name))
  } catch (e: any) {
    console.log('error:', JSON.stringify(e.data, null, 2))
  }
}
fixUsers()
