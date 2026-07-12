import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function check() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')

  const col = await pb.collections.getOne('user_stats')
  console.log('=== user_stats ===')
  const fields = (col as any).fields || []
  for (const f of fields) {
    if (f.system) continue
    console.log('  -', f.name, '|', f.type, '| required:', f.required, '| options:', JSON.stringify(f.options || {}))
  }
}

check().catch(console.error)
