import PocketBase from 'pocketbase'

const pb = new PocketBase('https://synmet.ma.cloud-ip.cc')

// 从 localStorage 恢复登录状态
const savedToken = localStorage.getItem('pb_auth_token')
const savedUser = localStorage.getItem('pb_auth_user')
if (savedToken) {
  let savedRecord = null
  if (savedUser) {
    try {
      savedRecord = JSON.parse(savedUser)
    } catch {}
  }
  pb.authStore.save(savedToken, savedRecord)
}

// 监听认证状态变化，同步保存到 localStorage
pb.authStore.onChange(() => {
  localStorage.setItem('pb_auth_token', pb.authStore.token)
  const record = (pb.authStore as any).record
  if (record) {
    localStorage.setItem('pb_auth_user', JSON.stringify(record))
  } else {
    localStorage.removeItem('pb_auth_user')
  }
})

export default pb
