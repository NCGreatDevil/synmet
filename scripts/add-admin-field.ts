import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function addAdminField() {
  // 使用管理员账号登录（请替换为实际账号）
  await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL || '', process.env.PB_ADMIN_PASSWORD || '')

  // 1. 获取 users 集合（内部名称为 _pb_users_auth_）
  const col = await pb.collections.getOne('_pb_users_auth_')

  // 2. 检查 is_admin 字段是否已存在
  const existingField = col.fields.find((f: any) => f.name === 'is_admin')
  if (existingField) {
    console.log('is_admin 字段已存在')
  } else {
    // 添加 is_admin 字段
    const updatedFields = [
      ...col.fields,
      {
        name: 'is_admin',
        type: 'bool',
        required: false,
        presentable: false,
        system: false,
        hidden: false,
        defaultValue: false
      }
    ]
    await pb.collections.update('_pb_users_auth_', { fields: updatedFields })
    console.log('is_admin 字段创建成功')
  }

  // 3. 设置默认管理员（请替换为实际用户 ID）
  const adminUserId = process.env.PB_DEFAULT_ADMIN_ID || ''
  if (adminUserId) {
    await pb.collection('users').update(adminUserId, { is_admin: true })
    console.log(`已设置 ${adminUserId} 为管理员`)
  }

  // 4. 更新权限规则：只有管理员才能管理用户
  await pb.collections.update('_pb_users_auth_', {
    listRule: '@request.auth.is_admin = true',
    viewRule: '@request.auth.is_admin = true || @request.auth.id = id',
    createRule: '@request.auth.is_admin = true',
    updateRule: '@request.auth.is_admin = true || @request.auth.id = id',
    deleteRule: '@request.auth.is_admin = true'
  })
  console.log('users 集合权限规则已更新')
}

addAdminField()
