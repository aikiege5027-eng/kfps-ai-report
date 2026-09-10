<script setup lang="ts">
/**
 * AppSidebar — 侧边导航栏
 *
 * 规范来源：Design System 模板站 #/nav 的 `.sidebar` 实现（已比对线上 CSS 与 JS）。
 * 关键规格：
 *   .sidebar          232px / 收起 64px，fixed top:56px，overflow hidden，**没有右边框**
 *   .sidebar-scroll   flex:1，overflow hidden auto，
 *                     scrollbar-width: thin + scrollbar-color 细滚动条
 *   .menu-expanded    padding 16px 8px 8px，gap 2px
 *   .menu-1st/2nd/3rd radius-medium，min-height 36px，14px/400/22px
 *                     padding 一级 7px 16px、二级 7px 16px 7px 44px、三级 7px 16px 7px 72px
 *   .menu-prefix-icon 20×20 容器，内部 server icon 也是 20px
 *   .chevron          color text-color-placeholder（比文字更浅）
 *   submenu wrap      gap 2px，margin-top 2px
 *   .menu-icon-only   收起态 48×36，radius-medium
 *   .sidebar-footer   固定 56px 高，padding 0 16px，border-top component-stroke
 *   .collapse-btn     32×32，radius-default，color text-color-secondary
 *                     hover bg-color-component（注意不是 container-hover）
 *                     图标 16px
 *
 * 展开/收起箭头使用 chevronUp / chevronDown 两个独立 icon，不用 rotate 翻转。
 * 收起态只做「高亮所在一级菜单 + 直接切换 active」，不展开侧栏、不弹层级。
 *
 * ── 三级菜单的命名对照 ──────────────────────────────────────────────
 * 设计系统里第三级叫「基础菜单」，不叫「三级菜单」。CSS class 沿用参考实现的
 * `.menu-3rd`，但沟通和 Figma 查阅时要用「基础菜单 / base menu item」：
 *
 *   层级      设计系统名称    Figma 变体名        CSS class      特征
 *   第一级    一级菜单        1st menu item      .menu-1st      带 prefix icon
 *   第二级    二级菜单        2nd menu item      .menu-2nd      缩进 44px
 *   第三级    基础菜单        base menu item     .menu-3rd      缩进 72px，叶子
 *
 * Figma 里同时还有 `popupMenu item` 与 `collapsedMenu item` 两组变体，
 * 各自也分 1st / 2nd / base 三级。参考实现的侧边导航页只用到普通那组。
 *
 * ── 层级是「有没有 children」决定的，不是固定三层 ────────────────────
 * 参考实现的 demo 数据里，一级和二级都可以没有 children：
 *   - 一级无 children → 不显示 chevron，点击直接选中（不是展开）
 *   - 二级无 children → 同上
 *   - 基础菜单永远是叶子，不显示 chevron
 * 本组件按同样规则渲染，占位数据里已覆盖这几种情况，改数据时不用改组件。
 */
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from '@/assets/icons/iconPaths'

export interface MenuItem {
  key: string
  label: string
  /** 仅一级菜单使用；二级与基础菜单不带 icon */
  icon?: IconName
  /**
   * 有 children 才渲染 chevron 并可展开；没有 children 就是可选中的叶子。
   * 一级和二级都允许没有 children，最深一层（基础菜单）必然没有。
   */
  children?: MenuItem[]
}

const props = withDefaults(
  defineProps<{
    items?: MenuItem[]
    defaultActiveKey?: string
    defaultExpandedKeys?: string[]
  }>(),
  {
    items: undefined,
    // 默认选中首项「对话」；当前菜单全为叶子，没有可展开项
    defaultActiveKey: 'chat',
    defaultExpandedKeys: () => [],
  },
)

/**
 * 菜单数据。名称来自产品提供的功能清单，「对话」置顶，「系统设置」置底。
 *
 * 层级：7 个一级叶子菜单 + 1 个带二级菜单的「系统设置」。
 * 角色管理 / 用户管理 / LLM 配置 收归到系统设置之下作为二级菜单。
 * 「个人设置」不在这里 —— 它已移到顶栏账户 icon 的下拉菜单里（见 AppHeader.vue）。
 * 二级菜单不带 icon —— 按设计系统规范，只有一级菜单有 prefix icon。
 *
 * 一级 icon 统一用 server，与参考实现 demo 一致（demo 里所有一级菜单都是这个 icon）。
 * 各功能的专属 icon 待设计给出后再逐项替换，并同步更新 icon-registry.json。
 */
const fallbackItems: MenuItem[] = [
  { key: 'chat', label: '对话', icon: 'server' },
  { key: 'datasource', label: '数据源', icon: 'server' },
  { key: 'skill', label: '技能', icon: 'server' },
  { key: 'plan-analysis', label: '计划分析', icon: 'server' },
  { key: 'component-trace', label: '部件溯源', icon: 'server' },
  { key: 'share', label: '分享', icon: 'server' },
  { key: 'scheduled-report', label: '定时报告', icon: 'server' },
  {
    key: 'settings',
    label: '系统设置',
    icon: 'server',
    // 二级菜单不带 icon（只有一级菜单有 prefix icon）
    children: [
      { key: 'settings/role', label: '角色管理' },
      { key: 'settings/user', label: '用户管理' },
      { key: 'settings/llm', label: 'LLM 配置' },
    ],
  },
]

const menuItems = computed(() => props.items ?? fallbackItems)

const collapsed = ref(false)
const activeKey = ref(props.defaultActiveKey)
const expandedKeys = ref<string[]>([...props.defaultExpandedKeys])

const emit = defineEmits<{
  (e: 'select', key: string): void
  (e: 'collapse-change', collapsed: boolean): void
}>()

const isExpanded = (key: string) => expandedKeys.value.includes(key)
const isActive = (key: string) => activeKey.value === key

/**
 * 一级菜单 key → 其整棵子树（含自身）的 key 集合，用于收起态判断高亮哪一项。
 *
 * 参考实现这里用的是 `activeKey.startsWith(key)` 字符串前缀匹配，在它自己的
 * demo 数据（key 为 '1'…'12'）里就有缺陷：activeKey 为 '12-1' 时
 * '12-1'.startsWith('1') 同样成立，一级菜单 '1' 会被一起误高亮。
 * 这里按真实子树判断，与 key 怎么命名无关。
 */
const branchKeys = computed(() => {
  const collect = (item: MenuItem, into: Set<string>) => {
    into.add(item.key)
    item.children?.forEach((child) => collect(child, into))
  }
  const map = new Map<string, Set<string>>()
  for (const level1 of menuItems.value) {
    const set = new Set<string>()
    collect(level1, set)
    map.set(level1.key, set)
  }
  return map
})

const inActiveBranch = (key: string) => branchKeys.value.get(key)?.has(activeKey.value) ?? false

function toggleExpand(key: string) {
  const index = expandedKeys.value.indexOf(key)
  if (index === -1) expandedKeys.value.push(key)
  else expandedKeys.value.splice(index, 1)
}

function select(key: string) {
  activeKey.value = key
  emit('select', key)
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  emit('collapse-change', collapsed.value)
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar-scroll">
      <!-- 收起态：只显示一级菜单的图标 -->
      <nav v-if="collapsed" class="menu-collapsed" aria-label="主导航（收起）">
        <button
          v-for="level1 in menuItems"
          :key="level1.key"
          type="button"
          class="menu-icon-only"
          :class="{ 'menu-icon-only--active': inActiveBranch(level1.key) }"
          :title="level1.label"
          :aria-label="level1.label"
          @click="select(level1.key)"
        >
          <span v-if="level1.icon" class="menu-prefix-icon">
            <BaseIcon :name="level1.icon" />
          </span>
        </button>
      </nav>

      <!-- 展开态：三级菜单 -->
      <nav v-else class="menu-expanded" aria-label="主导航">
        <template v-for="level1 in menuItems" :key="level1.key">
          <button
            type="button"
            class="menu-1st"
            :class="{
              'menu-1st--active': isActive(level1.key),
              'menu-1st--expanded': isExpanded(level1.key),
            }"
            :aria-expanded="level1.children ? isExpanded(level1.key) : undefined"
            @click="level1.children ? toggleExpand(level1.key) : select(level1.key)"
          >
            <span v-if="level1.icon" class="menu-prefix-icon">
              <BaseIcon :name="level1.icon" />
            </span>
            <span class="menu-text">{{ level1.label }}</span>
            <span v-if="level1.children" class="chevron">
              <BaseIcon :name="isExpanded(level1.key) ? 'chevronUp' : 'chevronDown'" />
            </span>
          </button>

          <div v-if="level1.children && isExpanded(level1.key)" class="submenu-2nd-wrap">
            <template v-for="level2 in level1.children" :key="level2.key">
              <button
                type="button"
                class="menu-2nd"
                :class="{
                  'menu-2nd--active': isActive(level2.key),
                  'menu-2nd--expanded': isExpanded(level2.key),
                }"
                :aria-expanded="level2.children ? isExpanded(level2.key) : undefined"
                @click="level2.children ? toggleExpand(level2.key) : select(level2.key)"
              >
                <span class="menu-text">{{ level2.label }}</span>
                <span v-if="level2.children" class="chevron">
                  <BaseIcon :name="isExpanded(level2.key) ? 'chevronUp' : 'chevronDown'" />
                </span>
              </button>

              <div v-if="level2.children && isExpanded(level2.key)" class="submenu-3rd-wrap">
                <button
                  v-for="level3 in level2.children"
                  :key="level3.key"
                  type="button"
                  class="menu-3rd"
                  :class="{ 'menu-3rd--active': isActive(level3.key) }"
                  :aria-current="isActive(level3.key) ? 'page' : undefined"
                  @click="select(level3.key)"
                >
                  {{ level3.label }}
                </button>
              </div>
            </template>
          </div>
        </template>
      </nav>
    </div>

    <div class="sidebar-footer">
      <button
        type="button"
        class="collapse-btn"
        :title="collapsed ? '展开侧栏' : '收起侧栏'"
        :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="toggleCollapsed"
      >
        <BaseIcon name="viewList" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 56px;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: 232px;
  background: var(--bg-color-container);
  /* 模板站的侧边栏没有右边框，只靠背景色与页面底色区分 */
  overflow: hidden;
  transition: width 0.2s;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar-scroll {
  flex: 1;
  overflow: hidden auto;
  /* 细滚动条，避免默认滚动条在侧栏里显得又宽又重 */
  scrollbar-width: thin;
  scrollbar-color: var(--component-stroke) transparent;
}

.menu-expanded,
.menu-collapsed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 8px 8px;
}

.menu-1st,
.menu-2nd,
.menu-3rd {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  border: none;
  border-radius: var(--radius-medium);
  background: none;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  text-align: left;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.menu-1st {
  flex-shrink: 0;
  gap: 8px;
  padding: 7px 16px;
}

.menu-2nd {
  gap: 8px;
  padding: 7px 16px 7px 44px;
}

.menu-3rd {
  padding: 7px 16px 7px 72px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.menu-1st:hover,
.menu-2nd:hover,
.menu-3rd:hover {
  background: var(--bg-color-container-hover);
  color: var(--text-color-primary);
}

/* 展开中：只提升文字色，背景保持透明 */
.menu-1st--expanded,
.menu-2nd--expanded {
  color: var(--text-color-primary);
}

/* 选中 */
.menu-1st--active,
.menu-2nd--active,
.menu-3rd--active {
  background: var(--brand-color-light);
  color: var(--brand-color);
}

.menu-prefix-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: currentColor;
}

.menu-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chevron {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  /* 比菜单文字更浅 */
  color: var(--text-color-placeholder);
}

.submenu-2nd-wrap,
.submenu-3rd-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

/* 收起态的一级菜单按钮 */
.menu-icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 36px;
  border: none;
  border-radius: var(--radius-medium);
  background: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.menu-icon-only:hover {
  background: var(--bg-color-container-hover);
  color: var(--text-color-primary);
}

.menu-icon-only--active {
  background: var(--brand-color-light);
  color: var(--brand-color);
}

.sidebar-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: var(--bg-color-container);
  border-top: 1px solid var(--component-stroke);
}

.sidebar--collapsed .sidebar-footer {
  justify-content: center;
  padding: 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-default);
  background: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.collapse-btn:hover {
  background: var(--bg-color-component);
  color: var(--text-color-primary);
}
</style>
