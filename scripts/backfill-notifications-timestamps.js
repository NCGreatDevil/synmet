/**
 * 修复现有 notifications 记录的 created/updated 字段
 * 使用原始 fetch API 绕过 SDK 对系统字段的写保护
 * 
 * 使用方法：
 *   node scripts/backfill-notifications-timestamps.js
 */

import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')
const BASE_URL = 'https://synmet.ma.cloud-ip.cc'

async function main() {
  console.log('🔧 开始修复 notifications 记录的时间戳...')

  // 管理员登录
  try {
    await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
    console.log('✅ 管理员登录成功')
  } catch (err) {
    console.error('❌ 管理员登录失败:', err.message)
    process.exit(1)
  }

  // 获取所有通知记录
  const records = await pb.collection('notifications').getFullList({
    sort: '-id'
  })

  console.log(`  总共 ${records.length} 条通知记录`)

  let updatedCount = 0
  let skippedCount = 0

  for (const r of records) {
    const needsCreated = !r.created
    const needsUpdated = !r.updated

    if (!needsCreated && !needsUpdated) {
      skippedCount++
      continue
    }

    const now = new Date().toISOString()
    const created = needsCreated ? now : r.created
    const updated = needsUpdated ? now : r.updated

    try {
      // 使用原始 fetch API 绕过 SDK 对系统字段的写保护
      const res = await fetch(`${BASE_URL}/api/collections/notifications/records/${r.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token
        },
        body: JSON.stringify({ created, updated })
      })

      if (!res.ok) {
        console.error(`  ❌ 更新记录 ${r.id} 失败:`, res.statusText)
        continue
      }

      updatedCount++
      if (updatedCount % 10 === 0) {
        console.log(`  已修复 ${updatedCount} 条记录...`)
      }
    } catch (err) {
      console.error(`  ❌ 更新记录 ${r.id} 失败:`, err.message)
    }
  }

  console.log('')
  console.log(`🎉 修复完成！`)
  console.log(`  已修复: ${updatedCount} 条记录`)
  console.log(`  已跳过: ${skippedCount} 条记录（已有时间戳）`)
  console.log(`  总计: ${records.length} 条记录`)
}

main().catch(error => {
  console.error('❌ 修复失败:', error.message)
  process.exit(1)
})