// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import VotePage from '../pages/VotePage.vue'
import RankingPage from '../pages/RankingPage.vue'

const routes = [
  { path: '/',      component: VotePage },
  { path: '/ranking', component: RankingPage }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
