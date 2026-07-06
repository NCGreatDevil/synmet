import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function initCollections() {
  try {
    // 使用管理员账号登录（请替换为实际账号）
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL || '', process.env.PB_ADMIN_PASSWORD || '')
    console.log('管理员登录成功')

    // 创建 user_login_logs 集合
    try {
      await pb.collections.create({
        name: 'user_login_logs',
        type: 'base',
        schema: [
          { name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: 1, maxSelect: 1 } },
          { name: 'login_time', type: 'date', required: true },
          { name: 'login_ip', type: 'text', required: false, options: { max: 50 } },
          { name: 'device_type', type: 'text', required: false, options: { max: 50 } },
          { name: 'device_info', type: 'text', required: false, options: { max: 255 } }
        ],
        permissions: { create: 'auth', read: 'auth', update: 'auth', delete: 'auth' }
      })
      console.log('user_login_logs 集合创建成功')
    } catch (e: any) {
      console.log('user_login_logs 集合已存在或创建失败:', e.message)
    }

    // 创建 user_tags 集合
    try {
      await pb.collections.create({
        name: 'user_tags',
        type: 'base',
        schema: [
          { name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: 1, maxSelect: 1 } },
          { name: 'tag_name', type: 'text', required: true, options: { max: 50 } },
          { name: 'tag_type', type: 'number', required: true, default: 0 }
        ],
        permissions: { create: 'auth', read: 'auth', update: 'auth', delete: 'auth' }
      })
      console.log('user_tags 集合创建成功')
    } catch (e: any) {
      console.log('user_tags 集合已存在或创建失败:', e.message)
    }

    // 创建 user_stats 集合
    try {
      await pb.collections.create({
        name: 'user_stats',
        type: 'base',
        schema: [
          { name: 'user_id', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', cascadeDelete: true, minSelect: 1, maxSelect: 1 } },
          { name: 'login_count', type: 'number', required: true, default: 0 },
          { name: 'interaction_count', type: 'number', required: true, default: 0 },
          { name: 'popularity_score', type: 'number', required: true, default: 0 }
        ],
        permissions: { create: 'auth', read: 'auth', update: 'auth', delete: 'auth' }
      })
      console.log('user_stats 集合创建成功')
    } catch (e: any) {
      console.log('user_stats 集合已存在或创建失败:', e.message)
    }

    console.log('初始化完成')
  } catch (error: any) {
    console.error('初始化失败:', error.message)
  }
}

initCollections()
