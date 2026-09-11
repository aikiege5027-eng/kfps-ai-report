<script setup lang="ts">
/**
 * AppLayout — 应用骨架
 *
 * 规范来源：Design System 模板站 #/nav 的 `.nav-root / .main-body / .content-area` 实现。
 * 关键规格：
 *   .nav-root      bg-color-page，flex column，min-height 100vh
 *   .main-body     margin-top 56px，min-height calc(100vh - 56px)，display flex
 *   .content-area  flex:1，height calc(100vh - 56px)，margin-left 232px（收起 64px），
 *                  padding 24px 24px 0，overflow-y auto，flex column
 *   .content-card  bg-color-container，radius-medium，flex:1，min-height 400px，**自身无 padding**
 *   .page-footer   居中，text-color-placeholder，12px/20px，padding 16px，margin-top auto
 *
 * 内容区自己滚动（而不是整页滚动），所以 content-area 固定高度 + overflow-y auto。
 *
 * ── 两种内容区形态（route.meta.contentSurface）─────────────────────────
 *   card（缺省，模板站形态）
 *       .content-area 灰色页面底 + 24px 留白，内部一张白色 .content-card
 *   plain（目前只有「新对话」）
 *       不渲染 .content-card，白底直接铺在 .content-area 上，外层留白归零。
 *       白底铺在滚动容器而不是某个子元素上，所以内容不足一屏时下半部分也是白的，
 *       页脚同样落在白底上。页面内部的 padding 由页面自己给（例如 PlaceholderView 的 24px）。
 *   页面不要反向覆盖 AppLayout 的背景，形态一律在路由 meta 里声明。
 *
 * ── 侧栏与路由的关系 ────────────────────────────────────────────────
 * 约定 route.name === 菜单项 key（见 router/index.ts）。本组件负责把两边接起来：
 * 点菜单就 push 对应路由，高亮项反过来由当前路由决定 —— 所以浏览器前进后退、
 * 刷新、直接输 URL 都能对上，不需要在 AppSidebar 里存一份选中状态。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const sidebarCollapsed = ref(false)

const route = useRoute()
const router = useRouter()

const activeMenuKey = computed(() => String(route.name ?? ''))
const isPlainSurface = computed(() => route.meta.contentSurface === 'plain')

/**
 * 「系统设置」这类纯展开节点没有对应路由，侧栏收起态点它仍会 emit 一次 select，
 * 这里挡掉，否则 router.push 会抛未知路由的错。
 */
function handleMenuSelect(key: string) {
  if (!router.hasRoute(key)) return
  router.push({ name: key })
}
</script>

<template>
  <div class="nav-root">
    <AppHeader app-name="AI Report" />

    <div class="main-body">
      <AppSidebar
        :active-key="activeMenuKey"
        @select="handleMenuSelect"
        @collapse-change="(value: boolean) => (sidebarCollapsed = value)"
      />

      <div
        class="content-area"
        :class="{
          'content-area--collapsed': sidebarCollapsed,
          'content-area--plain': isPlainSurface,
        }"
      >
        <slot v-if="isPlainSurface" />
        <div v-else class="content-card">
          <slot />
        </div>
        <footer class="page-footer">
          Copyright @ 2019–2026 KONE. All Rights Reserved
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-color-page);
  font-family: inherit;
}

.main-body {
  display: flex;
  min-height: calc(100vh - 56px);
  margin-top: 56px;
}

.content-area {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: calc(100vh - 56px);
  margin-left: 232px;
  padding: 24px 24px 0;
  overflow-y: auto;
  transition: margin-left 0.2s;
}

.content-area--collapsed {
  margin-left: 64px;
}

/*
 * plain 形态：卡片容器不渲染，白底直接铺在滚动容器上。
 * padding 归零 —— 卡片没了，24px 的外部留白也就没有意义，
 * 页面内容自己给内边距（例如 PlaceholderView 的 24px）。
 */
.content-area--plain {
  padding: 0;
  background: var(--bg-color-container);
}

.content-card {
  flex: 1;
  min-height: 400px;
  background: var(--bg-color-container);
  border-radius: var(--radius-medium);
}

.page-footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 16px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  color: var(--text-color-placeholder);
}
</style>
