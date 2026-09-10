<script setup lang="ts">
/**
 * BaseIcon — Design System icon 的统一渲染出口
 *
 * 只负责提供 16×16 的 viewBox 和尺寸，path 数据来自 iconPaths.ts（Figma 真实矢量）。
 * 颜色通过 CSS `color` 继承，不要给这个组件传 fill。
 */
import { computed } from 'vue'
import {
  ICON_VIEW_BOX,
  iconDefaultSize,
  iconPaths,
  type IconName,
} from '@/assets/icons/iconPaths'

const props = withDefaults(
  defineProps<{
    /** icon 名称，见 iconPaths.ts */
    name: IconName
    /**
     * 渲染尺寸（px）。不传则使用 iconDefaultSize 里该 icon 的默认值，
     * 与 Design System 模板站保持一致。除非设计稿另有标注，不要覆盖它。
     */
    size?: number
    /** 无障碍标签。留空则视为装饰性图形，对读屏器隐藏 */
    label?: string
  }>(),
  { size: undefined, label: '' },
)

const inner = computed(() => iconPaths[props.name])
const renderSize = computed(() => props.size ?? iconDefaultSize[props.name])
const isDecorative = computed(() => props.label.length === 0)
</script>

<template>
  <svg
    class="base-icon"
    :width="renderSize"
    :height="renderSize"
    :viewBox="ICON_VIEW_BOX"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :role="isDecorative ? undefined : 'img'"
    :aria-hidden="isDecorative ? 'true' : undefined"
    :aria-label="isDecorative ? undefined : label"
    v-html="inner"
  />
</template>

<style scoped>
.base-icon {
  display: block;
  flex-shrink: 0;
  /* 颜色由父级 color 决定，path 使用 currentColor */
  color: inherit;
}
</style>
