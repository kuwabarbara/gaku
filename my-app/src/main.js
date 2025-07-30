import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { createPinia } from 'pinia'
import { firebaseApp } from './firebase'

//createApp(App).mount('#app')

const app = createApp(App)
app.use(createPinia())
app.mount('#app')