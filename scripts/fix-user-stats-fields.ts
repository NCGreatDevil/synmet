import PocketBase from 'pocketbase'
const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

async function fix() {
  await pb.admins.authWithPassword('goodmazi@126.com', 'mazi1990')
  const token = pb.authStore.token

  const col = await pb.collections.getOne('user_stats')
  const fields = ((col as any).fields || []).filter((f: any) => !f.system)

  const updated = fields.map((f: any) => {
    if (['login_count', 'interaction_count', 'popularity_score'].includes(f.name)) {
      return { ...f, required: false, options: { min: 0, default: 0 } }
    }
    return f
  })

  const res = await fetch('https://synmet.ma.cloud-ip.cc/api/collections/user_stats', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({ fields: updated })
  })
  const data = await res.json()
  if (data.message) {
    console.log(' error:', JSON.stringify(data.data, null, 2))
  } else {
    console.log('✓ user_stats 字段修复完成')
    for (const f of data.fields) {
      if (f.system) continue
      console.log('  -', f.name, '|', f.type, '| required:', f.required, '| options:', JSON.stringify(f.options || {}))
    }
  }
}

fix().catch(console.error)
