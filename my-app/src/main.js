import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { firebaseApp } from './firebase'
import { router } from './router'
import Vue3TouchEvents from "vue3-touch-events"

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.use(Vue3TouchEvents)
app.mount('#app')