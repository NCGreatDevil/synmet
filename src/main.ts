import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import NaiveUI from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(NaiveUI)

const authStore = useAuthStore()
await authStore.initAuth()

app.mount('#app')
