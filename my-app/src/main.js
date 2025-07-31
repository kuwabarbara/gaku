import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { firebaseApp } from './firebase'
import { router } from './router'

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.mount('#app')