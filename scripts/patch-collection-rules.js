/**
 * 修复集合权限：允许认证用户创建 communication_sessions、chat_groups、chat_group_members
 * 
 * 使用方法：
 *   node scripts/patch-collection-rules.js
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function main() {
  console.log('🔧 开始修复集合权限...')

  // 管理员登录
  try {
    await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
    console.log('✅ 管理员登录成功')
  } catch (err) {
    console.error('❌ 管理员登录失败:', err.message)
    process.exit(1)
  }

  // 需要修复的集合
  const collectionsToFix = ['communication_sessions', 'chat_groups', 'chat_group_members']
  const newCreateRule = '@request.auth.id != ""'

  for (const name of collectionsToFix) {
    try {
      const collection = await pb.collections.getOne(name)
      console.log(`\n  检查集合 "${name}":`)
      console.log(`    当前 createRule: ${collection.createRule}`)

      if (collection.createRule === newCreateRule) {
        console.log(`    ✅ 已是正确的权限，跳过`)
        continue
      }

      // 更新 createRule
      const updated = await pb.collections.update(collection.id, {
        createRule: newCreateRule,
        // 保留其他原有的配置
        listRule: collection.listRule,
        viewRule: collection.viewRule,
        updateRule: collection.updateRule,
        deleteRule: collection.deleteRule,
        fields: collection.fields,
        indexes: collection.indexes,
        systemFields: collection.systemFields,
      })

      console.log(`    ✅ 已更新 createRule 为: ${updated.createRule}`)
    } catch (err) {
      console.error(`    ❌ 更新失败:`, err.message)
    }
  }

  console.log('\n🎉 权限修复完成！')
}

main().catch(error => {
  console.error('❌ 修复失败:', error.message)
  process.exit(1)
})