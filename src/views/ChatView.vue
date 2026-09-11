<script setup lang="ts">
/**
 * ChatView — 「新对话」页
 *
 * 当前只有空态：跳动欢迎语 + 输入条。消息列表、技能选择、模型选择器、
 * 分享弹层等尚未接入，接入顺序见与产品的对话记录。
 *
 * 内容（欢迎语文案、输入框占位文案、回车发送规则）沿用现有 KFPS BI 的
 * `/kone-bi/conversations` 页；样式与结构全部改用 KONE China Design Token
 * 与 `.kiro/steering/ai-chat-component.md` 的对话组件规格。
 *
 * ── 布局 ────────────────────────────────────────────────────────────
 * 768px 内容列居中（对话组件规格的统一列宽），空态时整块在可视区垂直居中。
 * 本页在 AppLayout 里走 plain 形态（整块白底、无卡片），由路由 meta 声明。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ChatInputBar, { type PrerequisiteOption } from '@/components/ChatInputBar.vue'

/**
 * 前置条件（技能）清单。名称沿用现有 KFPS BI 对话页 `skills-selector` 里的那批，
 * 后续应改成从 `/skills` 接口拉取，这里先写死用于走通交互。
 */
const PREREQUISITES: PrerequisiteOption[] = [
  { id: 'dm-device-serial', name: 'DM设备序列号' },
  { id: 'e2e-abnormal', name: 'E2E异常检测明细' },
  { id: 'kcdp-device', name: 'KCDP设备基础信息' },
  { id: 'kfps-board-raw', name: 'KFPS印板原始数据' },
  { id: 'wats-test-record', name: 'WATS制造测试记录' },
  { id: 'wats-uuid-mapping', name: 'WATS序列号UUID映射' },
  { id: 'key-parts-join', name: 'Key Parts 综合跨表查询' },
  { id: 'field-data-process', name: '现场端数据处理' },
]

const selectedPrerequisite = ref<string | null>(null)

/**
 * 跳动欢迎语。三条文案来自现有 KFPS BI 对话页，逐字保留。
 * 排版按本项目字阶取 H3 28/36/600（原页面用的是浏览器默认 h1，不作参考）。
 */
const GREETINGS = [
  '你好，有什么可以帮您？',
  '通过技能 (Skill) 扩展，可以为您对接任意业务数据！',
  '选择指定的技能，能让我的回答更加精准哦！',
] as const

/** 单条停留时长（ms）。原页面没有暴露这个值，取一个够读完长句的节奏 */
const ROTATE_INTERVAL = 4000

const greetingIndex = ref(0)
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    greetingIndex.value = (greetingIndex.value + 1) % GREETINGS.length
  }, ROTATE_INTERVAL)
})

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})

const draft = ref('')

/**
 * 发送。消息列表还没接入，所以这里只清空草稿。
 * 接入后应改成：把草稿 + selectedPrerequisite 一起推进消息列表 →
 * 调后端流式接口 → 渲染 AI 回答。
 */
function handleSend(value: string) {
  void value
  draft.value = ''
}
</script>

<template>
  <div class="chat-page">
    <div class="chat-page__column">
      <div class="chat-greeting">
        <Transition name="greeting" mode="out-in">
          <h1 :key="greetingIndex" class="chat-greeting__text">
            {{ GREETINGS[greetingIndex] }}
          </h1>
        </Transition>
      </div>

      <!--
        空态用大尺寸形态（Figma 组件的 textarea 变体，固定 148 高）。
        接入消息列表后，底部常驻的那条输入条改用默认的 input 形态。
      -->
      <!--
        autofocus：进「新对话」页就是聚焦态，直接能打字。
        这是对话类页面的常规做法（主输入区就是页面的唯一目的），
        但对读屏用户会跳过页面标题直接进输入框，属于有意取舍。
      -->
      <ChatInputBar
        v-model="draft"
        v-model:selected="selectedPrerequisite"
        type="textarea"
        autofocus
        :options="PREREQUISITES"
        placeholder="直接向我提问 (回车发送，Shift+Enter 换行)"
        @send="handleSend"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  /* AppLayout 的 .content-area 是 flex column，flex:1 才能撑满 */
  display: flex;
  flex: 1;
  /*
   * 交叉轴顶部对齐（不是垂直居中）：
   * 空态只是过渡状态，有消息之后内容本来就是从上往下排的，顶对齐才是长期正确的布局；
   * 居中还会让上间距随窗口高度变化，不好控制。
   *
   * 上间距 160px：调档记录 64（太小）→ 120（偏小）→ 136 → 160。
   * 原来垂直居中的方案在常见窗口高度下约 140px，现在比那时略松。
   * 基础尺寸单位最大只到 72，布局级的偏移不在那套刻度内，所以取 8 的倍数的整数值。
   * 想再调只改这一个数。
   */
  align-items: flex-start;
  justify-content: center;
  padding: 160px 24px 24px;
}

.chat-page__column {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* 对话组件规格的统一内容列宽 */
  width: 100%;
  max-width: 768px;
}

.chat-greeting {
  /* 文案切换时高度会变（三条长度不同），固定两行高度避免输入框上下跳 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.chat-greeting__text {
  /* H3 28/Semibold */
  margin: 0;
  font-family: inherit;
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
  text-align: center;
  color: var(--text-color-primary);
}

/* 上滑淡入淡出。mode="out-in" 所以两段动画不重叠 */
.greeting-enter-active,
.greeting-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.greeting-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.greeting-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* 无障碍：用户要求减少动效时只保留淡入淡出，不做位移 */
@media (prefers-reduced-motion: reduce) {
  .greeting-enter-active,
  .greeting-leave-active {
    transition: opacity 0.28s ease;
  }

  .greeting-enter-from,
  .greeting-leave-to {
    transform: none;
  }
}
</style>
