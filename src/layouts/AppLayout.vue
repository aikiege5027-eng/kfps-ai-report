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
 */
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="nav-root">
    <AppHeader app-name="AI Report" />

    <div class="main-body">
      <AppSidebar @collapse-change="(value: boolean) => (sidebarCollapsed = value)" />

      <div class="content-area" :class="{ 'content-area--collapsed': sidebarCollapsed }">
        <div class="content-card">
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
