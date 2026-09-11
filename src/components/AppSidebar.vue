<script setup lang="ts">
/**
 * AppSidebar — 侧边导航栏
 *
 * 规范来源：Design System 模板站 #/nav 的 `.sidebar` 实现（已比对线上 CSS 与 JS）。
 * 关键规格：
 *   .sidebar          232px / 收起 64px，fixed top:56px，overflow hidden，
 *                     border-right component-stroke（本项目在模板站基础上加的，见下）
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
import { computed, ref, watch } from 'vue'
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
    /**
     * 受控选中项。传了就以它为准（本应用里由路由驱动，见 AppLayout），
     * 不传则组件自己记状态，方便单独预览。
     */
    activeKey?: string
    defaultActiveKey?: string
    defaultExpandedKeys?: string[]
  }>(),
  {
    items: undefined,
    activeKey: undefined,
    // 仅非受控模式生效；应用里的落地页由路由的 redirect 决定
    defaultActiveKey: 'chat',
    defaultExpandedKeys: () => [],
  },
)

/**
 * 菜单数据。名称来自产品提供的功能清单，「新对话」置顶，「系统设置」置底。
 *
 * 层级：7 个一级叶子菜单 + 1 个带二级菜单的「系统设置」。
 * 角色管理 / 用户管理 / LLM 配置 收归到系统设置之下作为二级菜单。
 * 「个人设置」不在这里 —— 它已移到顶栏账户 icon 的下拉菜单里（见 AppHeader.vue）。
 * 二级菜单不带 icon —— 按设计系统规范，只有一级菜单有 prefix icon。
 *
 * ── 一级 icon 的语义对照（都取自 Design Token China 的 💰Icon 页真实矢量）──
 *   新对话      chat-1    612:898    对话气泡
 *   数据源      server    612:1704   服务器机架 = 数据来源
 *   技能        toolbox   615:1743   工具箱 = 能力集合
 *   计划分析    chart-1   612:901    方框内折线趋势图
 *   部件溯源    fork      612:986    一节点分叉到两节点的树形，表达溯源链路
 *   分享        share     615:1718   标准分享字形
 *   定时报告    report    612:1712   方框内文本行 = 报告
 *   系统设置    setting   612:1701   六边形 + 中心圆环（KONE 的 setting 不是齿轮）
 *
 * 选型时逐个比对过字形，不是照名字挑的。两个踩过的坑记在这里：
 *   - `drive`（612:953）看名字像磁盘/数据盘，实际字形是**方向盘**，不能用于「数据源」，
 *     所以数据源沿用 server。
 *   - `equipment`（612:972）与 `chart-1` 都是「方框内含内容」的字形，并排时区分度低，
 *     「部件溯源」因此选了 fork。
 * 详细规格（node id / 矢量偏移 / 默认尺寸）见 src/assets/icons/icon-registry.json。
 */
const fallbackItems: MenuItem[] = [
  { key: 'chat', label: '新对话', icon: 'chat1' },
  { key: 'datasource', label: '数据源', icon: 'server' },
  { key: 'skill', label: '技能', icon: 'toolbox' },
  { key: 'plan-analysis', label: '计划分析', icon: 'chart1' },
  { key: 'component-trace', label: '部件溯源', icon: 'fork' },
  { key: 'share', label: '分享', icon: 'share' },
  { key: 'scheduled-report', label: '定时报告', icon: 'report' },
  {
    key: 'settings',
    label: '系统设置',
    icon: 'setting',
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
const internalActiveKey = ref(props.defaultActiveKey)
/** 受控优先：传了 activeKey 就完全听外部的，内部状态只作为非受控模式的兜底 */
const activeKey = computed(() => props.activeKey ?? internalActiveKey.value)
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

/** key → 其所有祖先 key。用于选中深层菜单时自动把上层展开 */
const ancestorKeys = computed(() => {
  const map = new Map<string, string[]>()
  const walk = (item: MenuItem, ancestors: string[]) => {
    map.set(item.key, ancestors)
    item.children?.forEach((child) => walk(child, [...ancestors, item.key]))
  }
  menuItems.value.forEach((item) => walk(item, []))
  return map
})

/**
 * 选中项变化时补齐它的祖先展开状态。
 * 直接输 URL / 刷新 / 浏览器后退落到二级菜单时，上层必须是展开的，否则看不见高亮。
 * 只做「补」不做「收」—— 用户手动展开的其他分支不该因为切页被收起。
 */
watch(
  activeKey,
  (key) => {
    const ancestors = ancestorKeys.value.get(key)
    if (!ancestors?.length) return
    for (const ancestor of ancestors) {
      if (!expandedKeys.value.includes(ancestor)) expandedKeys.value.push(ancestor)
    }
  },
  { immediate: true },
)

function toggleExpand(key: string) {
  const index = expandedKeys.value.indexOf(key)
  if (index === -1) expandedKeys.value.push(key)
  else expandedKeys.value.splice(index, 1)
}

function select(key: string) {
  internalActiveKey.value = key
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
  /*
   * 右边框：模板站原版没有，本项目按产品要求加上，与底部 .sidebar-footer 的
   * border-top 用同一个 token（component-stroke，比 component-border 浅）。
   * 全局 `* { box-sizing: border-box }` 已生效，所以这 1px 算在 232px 之内，
   * AppLayout 的 `.content-area { margin-left: 232px }` 不需要跟着改。
   */
  border-right: 1px solid var(--component-stroke);
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
