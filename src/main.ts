import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'

// 顺序很重要：先加载 TDesign 自带样式，再加载 style.css（--td-* 变量覆盖），
// 最后加载各组件的选择器级覆盖，否则会被 TDesign 自身样式盖掉。
import 'tdesign-vue-next/es/style/index.css'
import './style.css'
import './styles/tdesign-dropdown.css'

import App from './App.vue'
import router from './router'

createApp(App).use(router).use(TDesign).mount('#app')
