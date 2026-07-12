import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function test() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 测试不同排序方式
  const sorts = ['-created', '-id', '']
  for (const sort of sorts) {
    try {
      const result = await pb.collection('users').getList(1, 10, { sort })
      console.log(`sort="${sort}" -> OK, items: ${result.items.length}`)
    } catch (e: any) {
      console.log(`sort="${sort}" -> Error: ${e.status} ${e.message}`)
    }
  }

  // 看看用户的实际字段
  const users = await pb.collection('users').getFullList()
  const u = users[0] as any
  console.log('\n用户字段:', Object.keys(u).sort())
}
test()
