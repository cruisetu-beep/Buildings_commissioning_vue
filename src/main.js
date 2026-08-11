import { createApp } from "vue";
import router from "./router/index.js";
import App from "./App.vue";

import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// tokens.css 与 shared.css 原样从原型 cx_workbench.html 搬迁而来,全局引入
import "./assets/styles/tokens.css";
import "./assets/styles/shared.css";

createApp(App).use(router).use(ElementPlus).mount("#app");
