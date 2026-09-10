import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import PlaceholderView from '@/views/PlaceholderView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: PlaceholderView },
]

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
