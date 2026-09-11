<script setup lang="ts">
/**
 * BaseButton — China Design system for web 的 **Button 按钮**
 *
 * 组件集 `22709:32356`（file key `b5cc1y3jzLmOQkpa8vz5AX`），规格见
 * `.kiro/steering/web-components.md` 的 Button 章节。
 *
 * ── 只实现已核实过的变体 ─────────────────────────────────────────────
 * DS 的 Button 有 7 个变体轴（variant / size / theme / shape / icon+iconType /
 * state / disabled），组合上千个。这里**只**落地当前项目用到、且逐个从 Figma
 * 取过真值的那几档：
 *
 *   variant  base 基础 / text 文字按钮      （outline、dash、ghost 未核实）
 *   theme    primary 主要 / default 默认    （Secondary、danger 未核实）
 *   size     medium 中尺寸 = 32             （small 24、large 40 未核实）
 *   shape    square 方形                    （rectangle、round、circle 未核实）
 *   icon     singleIcon 独立图标            （prefixIcon、suffixIcon 未核实）
 *
 * 类型上做了收窄，写不出未核实的组合。要新增一档：先去 Figma 取该变体的
 * `get_variable_defs`，把 token 名写进 web-components.md，再放开类型。
 * **不要**照 TDesign 默认样式或凭色阶推导补齐。
 *
 * ── 已核实的配色（token 名直接来自 Figma variable）────────────────────
 *
 *   base / primary        底色                        图标色
 *     normal              --brand-color               --text-color-white
 *     hover               --brand-color-hover         同上
 *     active              --brand-color-active        同上
 *     disabled            --brand-color-disabled      同上（Figma 是 Color/Icon/Icon_white）
 *
 *   text / default        底色                        图标色
 *     normal              无（透明）                   --text-color-primary
 *     hover               --bg-color-component        同上
 *     active              --component-stroke          同上
 *     disabled            无（透明）                   --text-color-disabled
 *
 * 注意 text 的 hover **只加灰底、不改图标色** —— 这点和很多项目的习惯相反，
 * 是 DS 的规格，别顺手把图标改成品牌蓝。
 *
 * ── surface：text 变体必须知道自己踩在什么底色上 ──────────────────────
 * DS 给 text 的 hover/active 灰底（#f2f4f7 / #dfe1e8）是**按白色容器画的**。
 * 从白底数过去，hover 隔了 grey.50/100/200 三档，所以看得出来。
 *
 * 一旦这个按钮踩在 `--bg-color-secondarycontainer`（grey.100 #f5f7fa）上，
 * hover 的 #f2f4f7 就只差一档灰阶，几乎与底色融为一体 —— AI 对话输入条里的
 * 「+」就是这么丢掉 hover 反馈的。
 *
 * 解法不是自己调色，而是换到**当前底色所属的那一族** token：
 *
 *   surface='container'（默认，DS 规格）  hover --bg-color-component        (#f2f4f7)
 *                                        active --component-stroke          (#dfe1e8)
 *   surface='secondarycontainer'         hover --bg-color-secondarycontainer-hover  (#dfe1e8)
 *                                        active --bg-color-secondarycontainer-active (#c8cad0)
 *
 * 后者语义上就是「secondarycontainer 这块面的 hover / active」，两个主题都定义了
 * （深色：#1d1f26 → #262a33 → #333740），所以不是硬编码平移，深色模式自动跟着走。
 * 这是对 DS 的补充轴，DS 自己没有 surface 概念。
 *
 * ── 与 DS 的两处有意偏离 ─────────────────────────────────────────────
 * 1. **图标尺寸**：DS 的 singleIcon 在 32×32 里恒为 16px。本项目两个调用点
 *    都传了更大的值（发送 20、附件 28），因为它们的尺寸来自 Figma 的对话组件
 *    本体（见 icon-registry.json 的 `note`），先保留现有观感。
 *    `iconSize` 不传时按 DS 的 16 渲染。
 * 2. **focus 态**：DS 的 state 轴只有 normal/hover/active，没有键盘聚焦态。
 *    这里补了 `:focus-visible` 的 2px `--brand-color-focus` 外环，
 *    否则纯图标按钮 Tab 过去没有任何反馈，不满足可达性要求。
 */
import BaseIcon from './BaseIcon.vue'
import type { IconName } from '@/assets/icons/iconPaths'

withDefaults(
  defineProps<{
    /** 图标名，见 iconPaths.ts。当前只支持 singleIcon（纯图标）形态 */
    icon: IconName
    /**
     * 无障碍标签。纯图标按钮没有可见文字，**必须**传，
     * 否则读屏器只会念出 "button"。
     */
    label: string
    /** DS 的 variant 轴。'base' 实心，'text' 无底 */
    variant?: 'base' | 'text'
    /**
     * DS 的 theme 轴。可用组合受 variant 约束：
     * base 配 primary，text 配 default —— 这两组是核实过的。
     */
    theme?: 'primary' | 'default'
    /**
     * 按钮踩在什么底色上，决定 `variant='text'` 的 hover / active 灰底取哪一族 token。
     * 只影响 text 变体（base 是实心底，与容器无关）。见文件头的 surface 说明。
     */
    surface?: 'container' | 'secondarycontainer'
    /** 图标渲染尺寸（px）。不传按 DS 的 16，见文件头的偏离说明 */
    iconSize?: number
    disabled?: boolean
    /** 原生 type，默认 button（避免在 form 里意外提交） */
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'base',
    theme: 'primary',
    surface: 'container',
    iconSize: 16,
    disabled: false,
    type: 'button',
  },
)
</script>

<template>
  <button
    class="ds-button"
    :class="[
      `ds-button--${variant}`,
      `ds-button--${variant}-${theme}`,
      `ds-button--on-${surface}`,
    ]"
    :type="type"
    :disabled="disabled"
    :aria-label="label"
  >
    <BaseIcon :name="icon" :size="iconSize" />
  </button>
</template>

<style scoped>
/*
 * 几何：size=medium + shape=square → 32×32、radius-default(4px)、图标居中。
 * 32 这个数不能随便动：AI 对话输入条的操作行行高由最高的子元素决定，
 * 超过 32 会把整条输入条顶高（曾经用 36 导致 128 → 132）。
 */
.ds-button {
  box-sizing: border-box;
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
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.ds-button:disabled {
  cursor: not-allowed;
}

/* DS 没有定义聚焦态，这是补的，见文件头 */
.ds-button:focus-visible {
  outline: 2px solid var(--brand-color-focus);
  outline-offset: 1px;
}

/* ── variant=base / theme=primary ─────────────────────────────────── */
.ds-button--base-primary {
  background: var(--brand-color);
  color: var(--text-color-white);
}

.ds-button--base-primary:hover:not(:disabled) {
  background: var(--brand-color-hover);
}

.ds-button--base-primary:active:not(:disabled) {
  background: var(--brand-color-active);
}

.ds-button--base-primary:disabled {
  background: var(--brand-color-disabled);
}

/* ── variant=text / theme=default ─────────────────────────────────── */
.ds-button--text-default {
  color: var(--text-color-primary);
}

/* surface='container'：DS 原始规格，按白色容器画的 */
.ds-button--text-default.ds-button--on-container:hover:not(:disabled) {
  background: var(--bg-color-component);
}

.ds-button--text-default.ds-button--on-container:active:not(:disabled) {
  background: var(--component-stroke);
}

/*
 * surface='secondarycontainer'：整体往深的方向挪，取当前面自己那一族的
 * hover / active。见文件头 —— DS 那两档落在 #f5f7fa 上看不出来。
 */
.ds-button--text-default.ds-button--on-secondarycontainer:hover:not(:disabled) {
  background: var(--bg-color-secondarycontainer-hover);
}

.ds-button--text-default.ds-button--on-secondarycontainer:active:not(:disabled) {
  background: var(--bg-color-secondarycontainer-active);
}

.ds-button--text-default:disabled {
  color: var(--text-color-disabled);
}
</style>
