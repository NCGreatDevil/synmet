/**
 * 修复 notifications 集合：添加 created/updated 系统字段
 * 
 * 使用方法：
 *   node scripts/patch-notifications-system-fields.js
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function main() {
  console.log('🔧 开始修复 notifications 集合...')

  // 1. 使用管理员账号登录
  console.log('  管理员登录...')
  try {
    await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
    console.log('✅ 管理员登录成功')
  } catch (err) {
    console.error('❌ 管理员登录失败:', err.message)
    process.exit(1)
  }

  // 2. 获取 notifications 集合信息
  console.log('  获取 notifications 集合信息...')
  const collections = await pb.collections.getList(1, 100)
  const ntf = collections.items.find(c => c.name === 'notifications')

  if (!ntf) {
    console.error('❌ notifications 集合不存在')
    process.exit(1)
  }

  console.log(`  找到 notifications 集合 (ID: ${ntf.id})`)
  console.log(`  当前 systemFields: ${JSON.stringify(ntf.systemFields)}`)

  // 3. 检查是否已有 created/updated
  const hasCreated = ntf.systemFields?.includes('created')
  const hasUpdated = ntf.systemFields?.includes('updated')

  if (hasCreated && hasUpdated) {
    console.log('✅ notifications 集合已有 created 和 updated 字段，无需修复')
    return
  }

  // 4. 更新集合，添加 systemFields
  const newSystemFields = ['id', 'created', 'updated']
  console.log(`🔨 更新 systemFields 为：${JSON.stringify(newSystemFields)}`)

  // 准备更新数据 - 只更新 systemFields
  const updateData = {
    systemFields: newSystemFields,
    // 保留其他原有的字段和配置
    fields: ntf.fields,
    indexes: ntf.indexes,
    listRule: ntf.listRule,
    viewRule: ntf.viewRule,
    createRule: ntf.createRule,
    updateRule: ntf.updateRule,
    deleteRule: ntf.deleteRule,
  }

  const updated = await pb.collections.update(ntf.id, updateData)
  console.log('✅ notifications 集合更新成功')
  console.log(`  新 systemFields: ${JSON.stringify(updated.systemFields)}`)

  // 5. 验证
  console.log('')
  console.log('🔍 验证现有通知记录...')
  const records = await pb.collection('notifications').getList(1, 3, { sort: '-id' })
  
  if (records.items && records.items.length > 0) {
    const r = records.items[0]
    console.log(`  最新记录 ID: ${r.id}`)
    console.log(`  created: ${r.created || '(空)'}`)
    console.log(`  updated: ${r.updated || '(空)'}`)
  } else {
    console.log('  暂无通知记录')
  }

  console.log('')
  console.log('🎉 修复完成！')
  console.log('💡 提示：新创建的通知会自动包含 created 和 updated 时间戳')
}

main().catch(error => {
  console.error('❌ 修复失败:', error.message)
  console.error('完整错误:', error)
  process.exit(1)
})