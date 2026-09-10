<script setup lang="ts">
/**
 * 占位内容页 —— 只用于验证骨架布局，后续按业务替换。
 */
</script>

<template>
  <div class="placeholder">
    <h1 class="placeholder__title">内容区</h1>
    <p class="placeholder__desc">
      顶部导航栏、侧边导航栏与页面背景已就位。内容区待接入业务页面。
    </p>
  </div>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--size-8);
  /* content-card 自身无 padding（与模板站一致），由页面内容自己撑开留白 */
  padding: var(--size-24);
}

.placeholder__title {
  /* H3 28/Semibold */
  margin: 0;
  font-family: inherit;
  font-size: 28px;
  font-weight: var(--font-weight-semibold);
  line-height: 36px;
  color: var(--text-color-primary);
}

.placeholder__desc {
  /* Body 14/Regular */
  margin: 0;
  font-size: 14px;
  font-weight: var(--font-weight-regular);
  line-height: 22px;
  color: var(--text-color-secondary);
}
</style>
