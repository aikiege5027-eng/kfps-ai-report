import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * 内容区的「表面」形态，由 AppLayout 消费：
     *   'card'（缺省）灰色页面底 + 白色卡片容器，radius-medium，四周 24px 留白
     *   'plain'       整块白底、无卡片、无外层留白，页面自己决定内部 padding
     * 对话类、编辑器类整屏页面用 plain；常规列表 / 表单页用 card。
     */
    contentSurface?: 'card' | 'plain'
  }
}

/**
 * 路由与侧边栏菜单一一对应：**route.name === AppSidebar 菜单项的 key**，
 * path 就是 `/` + key。AppLayout 靠这个约定做两件事：
 *   1. 点菜单 → `router.push({ name: key })`
 *   2. 当前高亮项 → `route.name`
 * 新增页签时同时加菜单项和这里的路由，名字必须一致。
 *
 * 「系统设置」是纯展开节点，没有自己的页面，所以只有三个子项有路由。
 * 侧栏收起态点它会 emit 一次 select('settings')，AppLayout 用 hasRoute 挡掉。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'chat' } },

  // 新对话：整屏白底、无卡片
  { path: '/chat', name: 'chat', component: ChatView, meta: { contentSurface: 'plain' } },

  // 以下页面尚未实现，先挂占位页，形态用默认的灰底白卡
  { path: '/datasource', name: 'datasource', component: PlaceholderView },
  { path: '/skill', name: 'skill', component: PlaceholderView },
  { path: '/plan-analysis', name: 'plan-analysis', component: PlaceholderView },
  { path: '/component-trace', name: 'component-trace', component: PlaceholderView },
  { path: '/share', name: 'share', component: PlaceholderView },
  { path: '/scheduled-report', name: 'scheduled-report', component: PlaceholderView },
  { path: '/settings/role', name: 'settings/role', component: PlaceholderView },
  { path: '/settings/user', name: 'settings/user', component: PlaceholderView },
  { path: '/settings/llm', name: 'settings/llm', component: PlaceholderView },
]

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
