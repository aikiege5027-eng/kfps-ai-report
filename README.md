# KFPS AI Report

基于 KONE China Design System 搭建的 Web 应用骨架。

**在线预览**：https://aikiege5027-eng.github.io/kfps-ai-report/

目前实现的是页面框架，内容区为占位页：

- **顶部导航栏** — Logo + 应用名 + 搜索 / 语言切换 / 通知 / 账户四个操作
- **侧边导航栏** — 232px ↔ 64px 可折叠，支持三级菜单
- **账户下拉** — hover 账户图标展开
- **语言切换** — 点击在中 / 英图标间切换（见下方「已知限制」）

## 技术栈

| | |
|---|---|
| 构建 | Vite 8 |
| 框架 | Vue 3.5（`<script setup>` + TypeScript） |
| 组件库 | TDesign Vue Next |
| 路由 | Vue Router 4，`createWebHashHistory` |

用 hash 路由是为了适配 GitHub Pages —— 静态托管没有服务端 rewrite，history 模式刷新子路径会 404。

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173/
```

其他命令：

```bash
npm run build      # 类型检查 + 打包
npm run preview    # 预览打包产物
npm run typecheck  # 仅类型检查
```

## 目录结构

```
src/
├── style.css                    设计 Token（浅/深两套）+ TDesign 变量映射
├── styles/
│   └── tdesign-dropdown.css     Dropdown 的定制覆盖（全局，面板挂在 body 下）
├── assets/
│   ├── kone-logo.svg
│   └── icons/
│       ├── iconPaths.ts         icon 的 SVG path
│       └── icon-registry.json   每个 icon 的来源与规格
├── components/
│   ├── BaseIcon.vue             统一 16×16 viewBox 出口
│   ├── AppHeader.vue            顶部导航栏
│   └── AppSidebar.vue           侧边导航栏
├── layouts/
│   └── AppLayout.vue            整体骨架
└── views/
    └── PlaceholderView.vue      占位内容页
```

## 关于设计规范

颜色、圆角、尺寸一律通过 `src/style.css` 里的语义化 CSS 变量取用，不写十六进制字面值：

```css
color: var(--text-color-primary);
background: var(--brand-color-light);
border-radius: var(--radius-medium);
```

TDesign 组件的样式通过在 `:root` 覆盖 `--td-*` 变量统一接管，而不是在各组件里逐个 `:deep()` 改。

深色模式：给 `<html>` 设 `data-theme="dark"` 即整体切换。

> **注**：本项目原本包含一组 `.kiro/steering/` 设计规范文档，由 KONE Design System
> 团队维护，属于内部资料，因此未纳入本仓库（见 `.gitignore`）。仓库内保留的是这些
> 规范落地后的实现，以及 `icon-registry.json` 里的 icon 规格记录。

## 已知限制

- **语言切换不翻译文案** — 点击只切换图标、更新 `<html lang>` 并派发事件。真正的多语言需要接入 `vue-i18n`，尚未做
- **打包体积偏大**（JS 约 1.3 MB） — TDesign 目前是全量注册，而骨架实际只用到 Dropdown。后续可改为按需引入
- **深色模式部分 Token 待确认** — 有 8 个背景色 Token 的深色值是按灰阶推导的，`style.css` 中已用 `/* 推导 */` 标注
- 内容区为占位页，业务功能未实现

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布到 GitHub Pages。

打包时 `vite.config.ts` 会把 `base` 设为 `/kfps-ai-report/`。**仓库改名时这个值必须同步修改**，否则线上资源会全部 404。
