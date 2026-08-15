/**
 * 修复所有集合的 number 字段 onlyInt 配置
 * 
 * 使用方法：
 *   node scripts/patch-number-fields.js
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

// 需要修复的集合和字段
const fieldFixes = {
  matchmaker_applications: [
    { name: 'user_a_status', onlyInt: true },
    { name: 'user_b_status', onlyInt: true },
    { name: 'application_status', onlyInt: true },
  ],
  communication_sessions: [
    { name: 'session_status', onlyInt: true },
  ],
  chat_groups: [
    { name: 'group_type', onlyInt: true },
    { name: 'group_status', onlyInt: true },
  ],
  chat_group_members: [
    { name: 'member_role', onlyInt: true },
    { name: 'is_active', onlyInt: true },
  ],
  messages: [
    { name: 'message_type', onlyInt: true },
    { name: 'duration', onlyInt: true },
  ],
  notifications: [
    { name: 'notification_type', onlyInt: true },
  ],
}

async function main() {
  console.log('🔧 开始修复 number 字段 onlyInt 配置...')

  // 管理员登录
  try {
    await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
    console.log('✅ 管理员登录成功')
  } catch (err) {
    console.error('❌ 管理员登录失败:', err.message)
    process.exit(1)
  }

  for (const [collectionName, fields] of Object.entries(fieldFixes)) {
    try {
      const collection = await pb.collections.getOne(collectionName)
      let needsUpdate = false

      for (const fix of fields) {
        const field = collection.fields.find(f => f.name === fix.name)
        if (field && field.type === 'number' && field.onlyInt !== fix.onlyInt) {
          console.log(`  ${collectionName}.${fix.name}: onlyInt ${field.onlyInt} -> ${fix.onlyInt}`)
          field.onlyInt = fix.onlyInt
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        const updated = await pb.collections.update(collection.id, {
          fields: collection.fields,
        })
        console.log(`  ✅ ${collectionName} 已更新`)
      } else {
        console.log(`  ⏭️ ${collectionName} 无需更新`)
      }
    } catch (err) {
      console.error(`  ❌ ${collectionName} 修复失败:`, err.message)
    }
  }

  console.log('\n🎉 字段配置修复完成！')
}

main().catch(error => {
  console.error('❌ 修复失败:', error.message)
  process.exit(1)
})