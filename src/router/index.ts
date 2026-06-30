import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Square from '../views/Square.vue'
import TestMob from '../views/Test-mob.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/square', component: Square },
  { path: '/test-mob', component: TestMob }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
