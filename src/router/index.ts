import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Home from '../views/Home.vue'
import Square from '../views/Square.vue'
import TestMob from '../views/Test-mob.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import UserManagement from '../views/UserManagement.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/test-mob', component: TestMob },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/square', component: Square, meta: { requiresAuth: true } },
  { path: '/users', component: UserManagement, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  
  // 确保认证状态已初始化
  if (!authStore.currentUser && authStore.isAuthenticated) {
    await authStore.initAuth()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }
  
  // 用户管理页面需要管理员权限
  if (to.path === '/users' && authStore.isAuthenticated) {
    if (!authStore.isAdmin) {
      // 非管理员无权访问，跳转到首页
      return '/'
    }
  }
  
  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    return '/'
  }
  
  return true
})

export default router
