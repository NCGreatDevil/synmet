import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function main() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  // 尝试使用 pb_users_auth_ 而不是 _pb_users_auth_
  const col = await pb.collections.getOne('user_login_logs')
  const fields = ((col as any).fields || []).filter((f: any) => !f.system)

  const testFields = [...fields, {
    name: 'test_relation',
    type: 'relation',
    required: false,
    options: {
      collectionId: 'pb_users_auth_',  // 尝试不带下划线前缀
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
    console.log('success with pb_users_auth_!')
    console.log('fields:', data.fields.filter((f: any) => !f.system).map((f: any) => f.name))
  } else {
    console.log('error with pb_users_auth_:', JSON.stringify(data.data, null, 2))
  }
}
main()
