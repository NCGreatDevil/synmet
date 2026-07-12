import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function main() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  // 先删除之前添加的 test_field
  const col = await pb.collections.getOne('user_login_logs')
  const fields = ((col as any).fields || []).filter((f: any) => !f.system && f.name !== 'test_field')
  console.log('current fields:', fields.map((f: any) => f.name))

  // 尝试添加 relation 字段，使用不同的 collectionId 格式
  const testFields = [...fields, {
    name: 'test_relation',
    type: 'relation',
    required: false,
    options: {
      collectionId: '_pb_users_auth_',
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1
    }
  }]

  const res = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_login_logs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: testFields })
  })
  const data = await res.json()

  if (res.ok) {
    console.log('success!')
    console.log('fields:', data.fields.filter((f: any) => !f.system).map((f: any) => f.name))
  } else {
    console.log('error:', JSON.stringify(data, null, 2))
  }
}
main()
