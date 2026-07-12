import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function main() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 用原始 API 获取集合列表，查看真实的 ID
  const result = await pb.send('/api/collections', {
    method: 'GET',
    params: { page: 1, perPage: 100 }
  })

  console.log('All collections:')
  for (const col of result.items) {
    console.log('  name:', col.name, '| id:', col.id)
  }

  // 找到 users 集合
  const usersCol = result.items.find((c: any) => c.name === 'users')
  if (usersCol) {
    console.log('\nusers collection:')
    console.log('  name:', usersCol.name)
    console.log('  id:', usersCol.id)
    console.log('  type:', usersCol.type)
  }
}
main()
