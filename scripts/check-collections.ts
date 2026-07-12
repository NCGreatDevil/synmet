import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function check() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  const collections = ['_pb_users_auth_', 'user_login_logs', 'user_tags', 'user_stats']
  for (const colName of collections) {
    const col = await pb.collections.getOne(colName)
    const displayName = colName === '_pb_users_auth_' ? 'users' : colName
    console.log('\n=== ' + displayName + ' ===')
    console.log('type:', col.type)
    console.log('listRule:', col.listRule)
    console.log('viewRule:', col.viewRule)
    console.log('createRule:', col.createRule)
    console.log('updateRule:', col.updateRule)
    console.log('deleteRule:', col.deleteRule)
    console.log('fields:')
    const fields = (col as any).fields || []
    for (const f of fields) {
      if (f.system) continue
      console.log('  -', f.name, '|', f.type, '| required:', f.required, '| options:', JSON.stringify(f.options || {}))
    }
    if (col.type === 'auth') {
      console.log('  [built-in] email | auth')
      console.log('  [built-in] password | auth')
      console.log('  [built-in] emailVisibility | auth')
      console.log('  [built-in] verified | auth')
      console.log('  [built-in] name | auth')
      console.log('  [built-in] avatar | auth')
    }
  }
}
check()
