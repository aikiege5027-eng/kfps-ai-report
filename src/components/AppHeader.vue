<script setup lang="ts">
/**
 * AppHeader — 顶部导航栏
 *
 * 规范来源：Design System 模板站 #/nav 的 `.top-nav` 实现（已比对线上 CSS）。
 * 关键规格：
 *   .top-nav        56px 高，padding 0 24px，bg-color-container + component-stroke 下边框
 *   .top-nav-left   gap 24px
 *   .kone-logo      height 28px，width auto，object-fit contain
 *   .app-name       18px / 600 / 26px，text-color-primary
 *   .top-nav-right  gap 8px
 *   .icon-btn       32×32，radius-default，color text-color-brand
 *                   hover  bg brand-color-light + color brand-color
 *                   active bg brand-color-focus
 *   图标本身 16px（不是 20px —— 16 的图形放大到 20 线条会明显变粗）
 */
import { computed, ref } from 'vue'
import type { DropdownOption } from 'tdesign-vue-next'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from '@/assets/icons/iconPaths'
import koneLogo from '@/assets/kone-logo.svg'

export type Locale = 'zh-CN' | 'en-US'

withDefaults(defineProps<{ appName?: string }>(), { appName: 'AI Report' })

const emit = defineEmits<{
  (e: 'account-command', value: string): void
  (e: 'locale-change', locale: Locale): void
}>()

/*
 * 右侧四个操作图标顺序固定为 search / language / notification / user
 * （见 templates.md「不可随意修改的部分」），所以逐个显式渲染，
 * 不用循环 + 例外分支 —— 那样顺序约束在代码里看不出来。
 */

/* ── 语言切换 ──────────────────────────────────────────────────────────────
 * icon 显示的是**当前**语种（中文界面显示 CH，英文界面显示 EN），
 * 点击切到另一种。若产品希望反过来（显示「将切换到的语种」），
 * 把 localeIcon 的三元判断取反即可。
 *
 * ⚠️ 目前项目没有接 i18n，所以点击只做三件事：换 icon、更新 <html lang>、
 *    向外 emit。界面文案不会真的翻译，需要另外接 vue-i18n。
 */
const locale = ref<Locale>(
  (document.documentElement.lang as Locale) || 'zh-CN',
)

const localeIcon = computed<IconName>(() =>
  locale.value === 'zh-CN' ? 'languageZh' : 'languageEn',
)

const localeLabel = computed(() =>
  locale.value === 'zh-CN' ? '切换为 English' : '切换为中文',
)

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  document.documentElement.lang = locale.value
  emit('locale-change', locale.value)
}

/**
 * 账户下拉选项。
 *
 * 规格见 .kiro/steering/web-components.md「Dropdown 下拉菜单」。
 * - divider 挂在「修改密码」上：分割线渲染在该项**下方**，与 Figma 的
 *   「选项 + 分割线」纵向组合一致
 * - 「退出登录」用 theme: 'error'，对应 Figma 的 error 主题
 *   （TDesign 还支持 success / warning，但 KONE 规格未定义这两个主题的配色，不要用）
 */
const accountOptions: DropdownOption[] = [
  { content: '账户信息', value: 'account' },
  { content: '个人设置', value: 'profile', divider: true },
  { content: '退出登录', value: 'logout', theme: 'error' },
]

function onAccountCommand(option: DropdownOption) {
  emit('account-command', String(option.value ?? ''))
}
</script>

<template>
  <header class="top-nav">
    <div class="top-nav-left">
      <img class="kone-logo" :src="koneLogo" alt="KONE" />
      <span class="app-name">{{ appName }}</span>
    </div>

    <div class="top-nav-right">
      <button type="button" class="icon-btn" title="搜索" aria-label="搜索">
        <BaseIcon name="search" />
      </button>

      <!-- 语言切换：icon 反映当前语种，点击切到另一种 -->
      <button
        type="button"
        class="icon-btn"
        :title="localeLabel"
        :aria-label="localeLabel"
        @click="toggleLocale"
      >
        <BaseIcon :name="localeIcon" />
      </button>

      <button type="button" class="icon-btn" title="通知" aria-label="通知">
        <BaseIcon name="notification" />
      </button>

      <!--
        账户下拉：hover 触发。
        宽度用官方 prop 而不是 CSS —— 选项 148px + 面板左右 padding 各 6px = 面板 160px，
        与 web-components.md 的面板规格一致。
      -->
      <t-dropdown
        trigger="hover"
        placement="bottom-right"
        :options="accountOptions"
        :min-column-width="148"
        :max-column-width="148"
        @click="onAccountCommand"
      >
        <button type="button" class="icon-btn" title="个人" aria-label="个人">
          <BaseIcon name="user" />
        </button>
      </t-dropdown>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 200;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: var(--bg-color-container);
  border-bottom: 1px solid var(--component-stroke);
}

.top-nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.kone-logo {
  display: block;
  width: auto;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  color: var(--text-color-primary);
  white-space: nowrap;
}

.top-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-default);
  background: none;
  color: var(--text-color-brand);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.icon-btn:hover {
  background: var(--brand-color-light);
  color: var(--brand-color);
}

.icon-btn:active {
  background: var(--brand-color-focus);
}
</style>
