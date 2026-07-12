import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function check() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 获取一个用户记录，查看所有字段（包括系统字段）
  const users = await pb.collection('users').getFullList()
  if (users.length > 0) {
    const user = users[0] as any
    console.log('所有字段（含系统字段）:')
    console.log(Object.keys(user).sort())
    console.log('\ncreated:', user.created)
    console.log('updated:', user.updated)
  }
}
check()
