import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// 全局注册图标
import {
  Heart,
  HeartDislike,
  Add,
  Remove,
  Create,
  Close,
  Checkmark,
  Refresh
} from '@vicons/ionicons5'

const app = createApp(App)
app.use(router)
app.component('Heart', Heart)
app.component('HeartDislike', HeartDislike)
app.component('Add', Add)
app.component('Remove', Remove)
app.component('Create', Create)
app.component('Close', Close)
app.component('Checkmark', Checkmark)
app.component('Refresh', Refresh)
app.mount('#app')
