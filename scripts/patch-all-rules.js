/**
 * 补丁脚本：放宽所有集合的权限规则
 * 
 * 问题：messages 等集合的 updateRule 为 null，导致普通用户无法更新记录
 * 解决：将所有集合的 createRule/updateRule 设为 '@request.auth.id != ""'
 * 
 * 使用方法：
 *   node scripts/patch-all-rules.js
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

// 需要修复的集合列表
const collections = [
  'messages',
  'chat_groups', 
  'chat_group_members',
  'communication_sessions',
  'notifications'
]

async function main() {
  console.log('🔧 开始修复集合权限...\n')

  // 管理员登录
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  console.log('✅ 管理员登录成功\n')

  // 修复每个集合
  for (const name of collections) {
    try {
      const collection = await pb.collections.getOne(name)
      
      console.log(`📋 ${name}:`)
      console.log(`  修改前:`)
      console.log(`    createRule: ${collection.createRule}`)
      console.log(`    updateRule: ${collection.updateRule}`)
      console.log(`    deleteRule: ${collection.deleteRule}`)
      
      // 更新权限规则
      await pb.collections.update(collection.id, {
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""'
      })
      
      console.log(`  修改后:`)
      console.log(`    createRule: @request.auth.id != ""`)
      console.log(`    updateRule: @request.auth.id != ""`)
      console.log(`    deleteRule: @request.auth.id != ""`)
      console.log(`  ✅ 修复成功\n`)
    } catch (error) {
      console.error(`  ❌ 修复失败:`, error.message)
    }
  }

  console.log('🎉 权限修复完成！')
  console.log('\n⚠️  注意：当前权限规则较为宽松，所有已认证用户可以执行所有操作。')
  console.log('   建议在系统完整后再做细粒度权限控制。')
}

main().catch(error => {
  console.error('💥 错误:', error.message)
  process.exit(1)
})
