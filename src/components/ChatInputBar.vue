<script setup lang="ts">
/**
 * ChatInputBar — AI 对话输入条
 *
 * 规范来源：`.kiro/steering/ai-chat-component.md`「底部输入条（四态）」，
 * 对应 Figma 组件 `16942:21241`（My Device View, file key HKQhWrp0DNySYHyfHRNMZ8）。
 *
 * ── 形态（type，与 Figma 组件的 type 变体同名）─────────────────────────
 *   'input'（默认）48 高单行起步，文本超过一行自动切到 textarea 排版
 *   'textarea'     直接用大尺寸形态，固定 148 高（空态首屏那种）
 *
 * ── 交互状态：沿用 DS Input（web-components.md）的状态机 ──────────────
 * 本组件是 DS Input 的定制变体，容器视觉不同（灰底、无常态描边、radius-large），
 * 但**状态反馈逐条对齐**，只把「描边颜色」这一层换到我们的容器上：
 *
 *   状态          DS Input                        本组件
 *   normal        1px component-border            1px component-stroke（淡一档，见 CSS）
 *   hover         1px brand-color-hover           同色，无外发光
 *   focus         1px brand-color + 2px focus     完全相同（外发光是与 hover 的区分点）
 *   filled(有值)  容器同 normal，只有文字色变      同（原生 placeholder 行为自动满足）
 *   disabled      灰底 + 描边 + 禁用文字            见 CSS 里的说明，底色区分不出来
 *
 * 两点必须注意：
 * 1. **边框只跟聚焦有关，跟「有没有值」无关。** Figma 的 `status=typing` 变体
 *    文案是 `00|`，末尾那个 `|` 是光标 —— 它表示「聚焦且已输入」，不是「失焦但有值」。
 *    早先按 `focused || hasValue` 实现过，会导致失焦后蓝框还亮着，已纠正。
 * 2. hover 用 `--brand-color-hover`（#4373f7）而不是 `--brand-color`，
 *    比聚焦态浅一档，这是 DS Input 的规格，别写成同一个色。
 *
 * 「文本过长时 input 自动变成 textarea」是设计意图（同一个组件的两种形态），
 * 所以这里只有一个 <textarea rows="1">，靠测量 scrollHeight 决定用哪种排版，
 * 不是两个控件互相切换 —— 那样会丢失光标位置和输入法状态。
 *
 * ── 高度与内边距口径 ────────────────────────────────────────────────
 *   内边距：**四周等距 12**（产品要求）。多行态是 `padding: 12px`；
 *   单行态只写左右 12，上下靠固定 48 高 + align-items: center，见 CSS 里的说明。
 *
 *   单行：48（固定），内容是 32 高的按钮行，上下各余 7
 *   多行：12 + 文本区 72 + 8（gap）+ 32（操作行 = 发送按钮）+ 12 = 136
 *   （上面两个数都不含外框那 1px 描边，实际外高各再 +2）
 *
 *   文本区 72 = 3 行（3 × 24），超过就在文本区内部滚动，不继续长高。
 *
 *   Figma 的 textarea 是 148（内边距 8、文本区 92）。本项目先按产品要求把文本区
 *   压到 72 得到 128，之后又把内边距从 8 提到 12，落到 136。两处都是有意偏离，
 *   别照 Figma 改回去。要再压总高只能动文本区，但 72 = 3 行是硬要求。
 *   `MAX_TEXT_HEIGHT` 同时是 input 形态自动增高的上限，两个形态共用一个天花板。
 *
 * ── DOM 顺序与两种排版 ──────────────────────────────────────────────
 * 附件按钮在 DOM 里排在文本域之前（单行态它就在左边）。多行态不改 DOM，
 * 用 `flex-wrap` + 文本域 `order: -1; flex-basis: 100%` 把文本顶到第一行，
 * 附件与发送自然落到第二行。改 DOM 顺序会破坏 Tab 焦点顺序。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import BaseIcon from './BaseIcon.vue'

/** 前置条件（技能 / 数据源）选项 */
export interface PrerequisiteOption {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    /** 输入内容，v-model */
    modelValue: string
    placeholder?: string
    disabled?: boolean
    /**
     * 前置条件可选项。非空时「+」按钮改为打开选择浮层；
     * 为空时「+」退回 emit('attach')，交给调用方处理。
     */
    options?: PrerequisiteOption[]
    /** 已选前置条件的 id，v-model:selected。单选，再点一次可取消 */
    selected?: string | null
    /**
     * 形态，与 Figma 组件的 type 变体同名：
     *   'input'    48 高单行起步，超过一行自动变成 textarea 排版
     *   'textarea' 直接用大尺寸形态，固定 148 高
     */
    type?: 'input' | 'textarea'
    /**
     * 挂载后自动聚焦，进页面即是聚焦态。
     * 用 JS 主动 focus 而不是原生 autofocus 属性：SPA 里路由切换回来时
     * 组件是重新挂载的，原生 autofocus 只在文档首次加载时生效，切回来就不灵了。
     */
    autofocus?: boolean
  }>(),
  {
    placeholder: '',
    disabled: false,
    options: () => [],
    selected: null,
    type: 'input',
    autofocus: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:selected', value: string | null): void
  /** 回车或点击发送按钮触发，参数是去掉首尾空白的内容 */
  (e: 'send', value: string): void
  /** 没有 options 时，点「+」触发 */
  (e: 'attach'): void
}>()

/** 单行文本高度（= 行高），用于判断是否已经换行 */
const LINE_HEIGHT = 24
/**
 * 文本区高度上限 = 3 行。见文件头的高度口径。
 * 改这个值要同步改 CSS 里 `.chat-input--large .chat-input__field` 的 height，
 * 两处是同一个数（大尺寸定高，input 形态长到这个数为止）。
 */
const MAX_TEXT_HEIGHT = LINE_HEIGHT * 3

const textarea = ref<HTMLTextAreaElement | null>(null)
/** 由内容测量得出；`type: 'textarea'` 时恒为真，见 useTextareaLayout */
const grownToMultiline = ref(false)

const isLarge = computed(() => props.type === 'textarea')
/** 是否使用「文本独占首行 + 操作行沉底」的排版 */
const useTextareaLayout = computed(() => isLarge.value || grownToMultiline.value)

const canSend = computed(() => !props.disabled && props.modelValue.trim().length > 0)

/**
 * 点容器空白处也要聚焦到文本域 —— 原生 input 因为控件铺满容器天然有这个行为，
 * 这里容器比文本域大（左右内边距、单行态右侧空白、多行态操作行两侧空白），
 * 所以要手动补。`.self` 保证只在点到容器本身时触发，点按钮不受影响；
 * `.prevent` 防止 mousedown 的默认行为把刚给到的焦点又移走。
 */
function focusField() {
  if (props.disabled) return
  textarea.value?.focus()
}

/**
 * 按内容重算高度。
 * 必须先把 height 置为 auto 再读 scrollHeight，否则内容变短时量到的是旧高度。
 *
 * 大尺寸形态不参与测量：它的文本区高度固定 72（总高 128），由 CSS 决定，
 * 这里要把可能残留的行内 height 清掉，否则会盖掉 CSS。
 */
function resize() {
  const el = textarea.value
  if (!el) return
  if (isLarge.value) {
    el.style.height = ''
    return
  }
  el.style.height = 'auto'
  const contentHeight = el.scrollHeight
  grownToMultiline.value = contentHeight > LINE_HEIGHT + 1
  el.style.height = `${Math.min(contentHeight, MAX_TEXT_HEIGHT)}px`
}

watch([() => props.modelValue, () => props.type], () => nextTick(resize))

onMounted(() => {
  resize()
  if (props.autofocus) focusField()
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

/** 回车发送，Shift+Enter 换行。输入法组字期间的回车不能当发送 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}

function submit() {
  if (!canSend.value) return
  emit('send', props.modelValue.trim())
}

/* ── 前置条件浮层 ─────────────────────────────────────────────────── */

const root = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const hasOptions = computed(() => props.options.length > 0)
const selectedOption = computed(
  () => props.options.find((option) => option.id === props.selected) ?? null,
)

/** 「+」的行为取决于有没有 options：有就开浮层，没有就把事件抛给调用方 */
function onLeadClick() {
  if (props.disabled) return
  if (!hasOptions.value) {
    emit('attach')
    return
  }
  panelOpen.value = !panelOpen.value
}

/** 单选：点已选中的项就取消选择 */
function pick(id: string) {
  emit('update:selected', props.selected === id ? null : id)
  panelOpen.value = false
  // 选完把焦点还给文本域，用户可以直接继续打字
  nextTick(focusField)
}

function clearSelected() {
  emit('update:selected', null)
  nextTick(focusField)
}

/** 点浮层外面关掉。用 mousedown 而不是 click，避免与选项自身的 click 抢顺序 */
function onDocumentMousedown(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) panelOpen.value = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') panelOpen.value = false
}

watch(panelOpen, (open) => {
  if (open) {
    document.addEventListener('mousedown', onDocumentMousedown)
    document.addEventListener('keydown', onDocumentKeydown)
  } else {
    document.removeEventListener('mousedown', onDocumentMousedown)
    document.removeEventListener('keydown', onDocumentKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMousedown)
  document.removeEventListener('keydown', onDocumentKeydown)
})

defineExpose({ focus: () => textarea.value?.focus() })
</script>

<template>
  <div
    class="chat-input"
    :class="{
      'chat-input--multiline': useTextareaLayout,
      'chat-input--large': isLarge,
      'chat-input--disabled': disabled,
    }"
    ref="root"
    @mousedown.self.prevent="focusField"
  >
    <!-- 前置条件浮层：绝对定位在输入框正上方，与输入框左右对齐 -->
    <Transition name="panel">
      <div v-if="panelOpen" class="chat-input__panel" role="listbox" aria-label="选择前置条件">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="chat-input__option"
          :class="{ 'chat-input__option--active': option.id === selected }"
          role="option"
          :aria-selected="option.id === selected"
          @click="pick(option.id)"
        >
          <!-- DS CheckTag large 档的 prefixIcon 是 16px -->
          <BaseIcon name="toolbox" :size="16" />
          <span>{{ option.name }}</span>
        </button>
      </div>
    </Transition>

    <!--
      「+」和已选模块是一组，多行态一起留在操作行左端。
      Figma 的 textarea 变体里这两个也是包在同一个 flex 里的（gap 8）。
    -->
    <div class="chat-input__lead">
      <!--
        DS Button：variant=text / theme=default / size=medium / shape=square / singleIcon。

        图标是 `add`（纯十字，无外圈），不是 `add-circle`。带外圈那个在 32×32 按钮里
        两头不讨好：圈填满容器显得过大，缩到 DS 的 16 又只剩 14px 的细圈。
        尺寸 28 是 32 容器里的上限，取值推导见 icon-registry.json 的 sizeMath
        —— add 的矢量只占画框 50%，所以可见十字是 14px，不是 28。

        surface 必须声明：这个按钮踩在输入条的 --bg-color-secondarycontainer 上，
        DS 默认那档 hover 灰底在这个底色上看不出来。见 BaseButton.vue 文件头。
      -->
      <BaseButton
        variant="text"
        theme="default"
        surface="secondarycontainer"
        icon="add"
        :icon-size="28"
        :disabled="disabled"
        :aria-expanded="hasOptions ? panelOpen : undefined"
        :label="hasOptions ? '选择前置条件' : '添加附件'"
        @click="onLeadClick"
      />

      <!--
        已选模块 = DS Tag（variant=light, theme=primary, size=large, closable, icon）。
        两层结构不能拍平：DS 里 prefixContent（图标+文字）内部 gap 8，
        它与关闭按钮之间 gap 12，两个间距不一样。
      -->
      <span v-if="selectedOption" class="chat-input__chip">
        <span class="chat-input__chip-content">
          <BaseIcon name="toolbox" :size="16" />
          <span class="chat-input__chip-text">{{ selectedOption.name }}</span>
        </span>
        <button
          type="button"
          class="chat-input__chip-remove"
          :disabled="disabled"
          :aria-label="`移除 ${selectedOption.name}`"
          @click="clearSelected"
        >
          <BaseIcon name="closeM" :size="16" />
        </button>
      </span>
    </div>

    <textarea
      ref="textarea"
      class="chat-input__field"
      rows="1"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="placeholder || '输入内容'"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!--
      DS Button：variant=base / theme=primary / size=medium / shape=square / singleIcon。
      32×32 这个尺寸决定了多行态操作行的行高，换档要先看 BaseButton.vue 里的说明。
      iconSize 20 是有意偏离 DS 的 16（arrow-up-kone 在对话组件里就是 20）。
    -->
    <BaseButton icon="arrowUpKone" :icon-size="20" label="发送" :disabled="!canSend" @click="submit" />
  </div>
</template>

<style scoped>
.chat-input {
  box-sizing: border-box;
  /* 浮层相对输入框定位 */
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  /* 单行态固定 48 高；多行态由内容决定，见 --multiline */
  height: 48px;
  /*
   * 左右 12。Figma 原稿是 pl 12 / pr 8（右侧小是因为发送按钮自带视觉边距），
   * 产品要求四周相等，所以右侧也补到 12。
   * 单行态的上下不写 padding —— 它的内容是 32 高的按钮行，固定 48 的框靠
   * align-items: center 居中（上下各 7）。要给它也来 12 的话整条会变成 58，
   * 与 Figma 的 48 差太远，所以只在多行态做等距。
   */
  padding: 0 12px;
  /*
   * 底色：从 Figma 的规格往浅色方向挪了**两档**，都是产品逐轮确认的。
   *   Figma      --bg-color-component            grey.200  #f2f4f7
   *   第一轮     --bg-color-secondarycontainer   grey.100  #f5f7fa
   *   第二轮     --primitive-grey-50             grey.50   #fafbfc  ← 现在
   *
   * grey.50 在语义层**没有 token**（grey.100 之上直接跳到 grey.0 白色，而白色会与
   * 「新对话」页的白色内容区同色），所以走 style.css 里的组件专用变量
   * --chat-input-surface，深色模式的取值和理由都写在那儿。
   *
   * 代价：#fafbfc 落在白色内容区上几乎看不出填充，输入条的形状主要靠那圈 1px
   * --component-stroke 描边撑住。再往浅就只剩白色了，这一档是下限。
   */
  background: var(--chat-input-surface);
  /*
   * 常态描边：Figma 的对话组件常态是无描边的，这里按产品要求补上，
   * 但比 DS Input 常态用的 --component-border（#c8cad0）淡一档，
   * 取 --component-stroke（#dfe1e8）—— 与顶栏、侧栏那些分割线同色。
   * 补上描边之后 hover / focus 变成「同一条边换颜色」而不是「从无到有长出一条边」，
   * 状态过渡与 DS Input 一致，两态也更不容易混。
   */
  border: 1px solid var(--component-stroke);
  border-radius: var(--radius-large);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

/*
 * hover：沿用 DS Input 的规格 —— 描边 --brand-color-hover（#4373f7），
 * 比聚焦态浅一档，容器底色不变，**没有**外发光。
 * 用 :not(:focus-within) 排除聚焦，否则 :hover 带伪类、特异性更高，会盖掉聚焦样式。
 */
.chat-input:not(:focus-within):not(.chat-input--disabled):hover {
  border-color: var(--brand-color-hover);
}

/*
 * focus：DS Input 与 Figma 对话组件在这一条上完全一致 ——
 * 描边换成 --brand-color（#1450f5，比 hover 深一档）**并且**加 2px 外发光。
 * 外发光是区分 hover / focus 的关键，只看描边颜色两者很接近。
 *
 * 用 :focus-within 而不是 JS 记 focus 状态：容器里有文本域和两个按钮，
 * 焦点在其中任意一个上都该整体高亮；而且 CSS 伪类不会和 JS 状态失同步。
 */
.chat-input:focus-within {
  border-color: var(--brand-color);
  /* Figma effect style Light/Focus Shadow/Default：offset 0、radius 0、spread 2 */
  box-shadow: 0 0 0 2px var(--brand-color-focus);
}

/*
 * 多行态四周等距 12（产品要求）。
 * Figma 原稿这里是 8（148 = 8 + 92 + 8 + 32 + 8），12 是有意偏离；
 * 好处是与单行态的左右 12、以及 Figma 单行态的上下 12（48 = 12 + 24 + 12）对齐，
 * 整个组件只剩一个内边距值。
 * 代价：总高从 128 变 136，见文件头的高度口径。
 */
.chat-input--multiline {
  height: auto;
  flex-wrap: wrap;
  padding: 12px;
}

/* 多行态：文本顶到第一行，附件与发送落到第二行并分列两端 */
.chat-input--multiline .chat-input__field {
  order: -1;
  flex-basis: 100%;
}

.chat-input--multiline .chat-input__lead {
  margin-right: auto;
}

/*
 * 大尺寸形态：文本区高度固定 72（= 3 行），整体恒为 136（12 + 72 + 8 + 32 + 12）。
 * 不随内容长高，超过 3 行就在文本区内部滚动 —— Figma 的 textarea 是定高。
 * 这个 72 与 JS 里的 MAX_TEXT_HEIGHT 是同一个数，改一处要改两处。
 */
.chat-input--large .chat-input__field {
  height: 72px;
}

.chat-input__field {
  flex: 1;
  min-width: 0;
  /* 高度由 resize() 写入行内样式，这里只给下限 */
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  outline: none;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
  /* H7 16/Regular */
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  color: var(--text-color-primary);
}

.chat-input__field::placeholder {
  color: var(--text-color-placeholder);
}

.chat-input__lead {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

/*
 * 附件按钮与发送按钮的样式都在 BaseButton.vue 里（DS Button 组件），
 * 这里不要再补 :deep() 覆盖 —— 要改就去改 DS 那一层或换变体。
 */

/*
 * disabled：DS Input 的禁用态是「--bg-color-component-disabled 底 + 描边保持常态那条
 * + 禁用文字」，现在三条都能对上 ——
 * 常态底色降一档后禁用底色（#f2f4f7）比常态（#f5f7fa）深一点，描边沿用常态的 stroke。
 * 但深色模式下两个底色同为 #1d1f26，分不出来，所以底色只算浅色模式下的附加提示，
 * 主要信号是文字降到 --text-color-disabled + 光标 not-allowed + 两个按钮各自的禁用态。
 */
.chat-input--disabled {
  background: var(--bg-color-component-disabled);
  cursor: not-allowed;
}

.chat-input--disabled .chat-input__field,
.chat-input--disabled .chat-input__field::placeholder {
  color: var(--text-color-disabled);
}

.chat-input--disabled .chat-input__field {
  cursor: not-allowed;
}

/* ── 前置条件浮层 ─────────────────────────────────────────────────────
 * 规格来自 Figma node 17081:7694（对话组件里那个「故障代码」浮层）：
 * 白底、radius-large、padding 12、阴影 Light/Shadow/1 = 0 2px 5px rgba(0,0,0,.1)。
 * 与输入框左右对齐、贴在正上方（Figma 里浮层底边就压着输入条外框顶边，
 * 外框有 12px 内边距，所以视觉间距是 12 —— 我们没有外框，直接给 8px 间距）。
 * 选项之间的间距 Figma 只画了一项、没有定义，这里取 8。
 */
.chat-input__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  box-sizing: border-box;
  padding: 12px;
  background: var(--bg-color-container);
  border-radius: var(--radius-large);
  box-shadow: 0 2px 5px rgb(0 0 0 / 10%);
}

/*
 * 选项：按 China Design system for web 的 **CheckTag 可选标签** 规整
 * （组件集 31618:127697，取 theme=default / size=**large** / shape=square / icon=on）。
 * 规格见 web-components.md。几何：padding 5px 12px、gap 8、16px 图标、
 * Body 14/22/400、圆角 3px、总高 32。
 *
 * 圆角 3px 是 DS 里硬编码的值，不是 radius token（--radius-default 是 4）。
 * 这是 DS 自身的写法，这里照抄以保持一致，不要「顺手」改成 token。
 *
 * 常态留 1px 透明描边：只有 disabled 态才有描边，不预留会在禁用时高度跳 2px。
 *
 * ── 未选中底色比 DS 浅一档（有意偏离）────────────────────────────────
 * DS 是 normal --component-stroke(grey.300 #dfe1e8) → hover --component-border(grey.400 #c8cad0)。
 * 产品觉得在白色浮层里偏深，整体往浅色方向平移一档，改成
 * normal --bg-color-component(grey.200 #f2f4f7) → hover --bg-color-component-hover(grey.300 #dfe1e8)。
 * 两态之间仍然是一个灰阶的差，只是起点浅了一级；选中态不变。
 */
.chat-input__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: var(--bg-color-component);
  font-family: inherit;
  /* Body 14/Regular */
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: var(--text-color-primary);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.chat-input__option:hover {
  background: var(--bg-color-component-hover);
}

/*
 * 选中态：**偏离 DS CheckTag**。
 * DS 的 checked 是实心 --brand-color 底 + 白字，产品觉得在白色浮层里太跳，
 * 改用 Tag 的 light 变体配色（浅蓝底 + 主色文字）。
 * 注意 CheckTag 组件本身没有 variant 轴（只有 theme/size/shape/icon/hover/checked/disabled），
 * 所以这个 light 配色是从 Tag 借来的，不是 CheckTag 的某个变体。
 *
 * ── 底色比 DS Tag light 深一档（有意偏离）─────────────────────────────
 * DS Tag light 的底色是 --brand-color-light（blue.50 #f3f6fe），它和未选中的
 * --bg-color-component（grey.200 #f2f4f7）亮度几乎一样，扫视时分不出选中与否。
 * 所以往深的方向挪一档到 blue.70 #e7edfe。
 *
 * 这一档语义层**没有** token（brand-color-light 是 blue.50，再往上就直接跳到
 * brand-color-focus / light-hover 的 blue.100 #d0dcfd，偏饱和）。用 TDesign 品牌色阶
 * --td-brand-color-2 取值，与用户气泡取 blue.70 是同一个口子 —— 那一层在
 * style.css 里 Light / Dark 都定义了，所以深色模式也跟着走。
 * hover 顺着同一条阶梯到 --td-brand-color-3，两态在两个主题下都保持恰好一档的差
 * （浅色 #e7edfe → #d0dcfd，深色 #043566 → #064f99）。
 * 若直接用 --brand-color-light-hover 做 hover，深色模式下它与底色同为 #043566，hover 会失效。
 */
.chat-input__option--active {
  background: var(--td-brand-color-2);
  color: var(--brand-color);
}

.chat-input__option--active:hover {
  background: var(--td-brand-color-3);
}

/*
 * 已选模块（输入框里那个 chip）：按 DS 的 **Tag 标签** 实现
 * （组件集 31277:112840，取 variant=**light** / theme=primary / size=large /
 *  shape=square / closable=on / icon=on）。
 * 几何：padding 5px 12px、外层 gap 12、内层 gap 8、16px 图标、Body 14/22/400、
 * 圆角 3px、总高 **32**。
 *
 * 试过 light-outline（1px 主色描边）来和输入框底色拉开距离，产品否了：
 * 只留 light，靠底色加深一档解决。要改回描边的话别用 border，见下面的说明。
 *
 * 取 large 档不是随意选的：32 正好等于发送按钮的高度，操作行的行高由最高的子元素决定，
 * 用 medium（24）不会有问题，但之前那版对话组件规格的 36 会把整条输入框顶高 4px
 * （128 → 132）。要换尺寸档必须同时确认不超过 32。
 *
 * 相对 Figma 对话组件那个 chip 的两处偏离（都是有意的）：
 * 1. 那个 chip **只有图标没有文字**（只需表达「附了一个故障代码」），删除是叠在右上角的
 *    14px 角标。我们有 8 个具名前置条件，必须带文字才能分辨，所以改成
 *    「图标 + 文字 + 行内删除」，角标改行内是因为它会压住文字。
 * 2. 底色不用 Figma 的 blue/100(#d0dcfd)，走 blue.70 #e7edfe —— 与浮层选中项同色，
 *    两者是同一个对象的两个位置，必须一致。取值与偏离理由见浮层选中态那段注释。
 *    注意它落在输入框的 --bg-color-secondarycontainer(#f5f7fa) 上，
 *    比落在白色浮层上对比更弱，是这一档里的下限场景。
 *
 * 若日后要加描边（light-outline）：**不能用 border** ——
 * Figma 里带描边那两个 variant 的高度也是 32，说明 1px 画在里面；
 * 用 border 会变成 34（1+5+22+5+1），把操作行连带整条输入框顶高 2px。
 * 要加就用 `box-shadow: inset 0 0 0 1px`，它不参与布局。
 */
.chat-input__chip {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  max-width: 240px;
  padding: 5px 12px;
  /* 与 DS 一致的硬编码圆角，见浮层选项处的说明 */
  border-radius: 3px;
  background: var(--td-brand-color-2);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: var(--brand-color);
}

/* DS 的 prefixContent：图标与文字之间 gap 8（与外层的 12 不同） */
.chat-input__chip-content {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.chat-input__chip-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/*
 * 关闭按钮 = DS 的 item/tag-closeBtn（large 16px，theme=primary）。
 * 常态色就是 --brand-color（DS 导出的 svg fill 是 #1450F5，与文字同色），
 * 所以直接继承 currentColor，不加透明度。
 * hover：DS 用的是硬编码 #366EF4，语义层没有这个值；取最近的
 * --brand-color-hover(#4373f7) 代替，不写死十六进制。
 */
.chat-input__chip-remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  color: currentcolor;
  cursor: pointer;
  transition: color 0.15s;
}

.chat-input__chip-remove:hover:not(:disabled) {
  color: var(--brand-color-hover);
}

.chat-input__chip-remove:disabled {
  cursor: not-allowed;
}

/* 浮层出现/消失：轻微上移淡入，与欢迎语的过渡节奏保持一致 */
.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active {
    transition: opacity 0.15s ease;
  }

  .panel-enter-from,
  .panel-leave-to {
    transform: none;
  }
}
</style>
