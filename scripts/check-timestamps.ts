import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function check() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  // 通过原始 API 获取，查看完整响应
  const token = pb.authStore.token
  const res = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/users/records/h727hwnsjfxkwvr', {
    headers: { 'Authorization': token }
  })
  const data = await res.json()
  console.log('API 完整响应:')
  console.log(JSON.stringify(data, null, 2))
}
check()
