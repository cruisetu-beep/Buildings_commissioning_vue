# Buildings Commissioning · CX Workbench (Vue 3)

楼宇调适分析工作台 —— Vue 3 迁移版本。

原型(React + Babel Standalone,单 HTML 文件)正在逐模块迁移到 **Vue 3 + Vite** 技术栈。
本仓库为迁移目标仓库,`dev` 分支为日常开发分支。

## 技术栈

- Vue 3(Composition API + `<script setup>`)
- Vite
- vue-router 4

## 当前迁移进度

| 模块 | 页面 | 状态 |
|---|---|---|
| 判定规则 | 1.1 规则清单 | ✅ 已迁移 |
| 判定规则 | 1.2 规则详情 | ✅ 已迁移 |
| 判定规则 | 新增规则 | ✅ 已迁移 |
| 参数配置 | 2.1 业态阈值矩阵 | ✅ 已迁移 |
| 判定结果 | 4.1 建筑清单 | ✅ 已迁移 |
| 判定结果 | 4.3 建筑详情 | ✅ 已迁移 |
| 判定计算 / 计算过程 / 调适建议 / 运行历史 | 全部页面 | ⏳ 占位页,待后续批次 |

## 目录结构

```
src/
  assets/styles/       # 全局样式(原样从原型迁移,未做任何视觉改动)
    tokens.css          # 设计 token(颜色/圆角/阴影等 CSS 变量)
    shared.css          # 全局共享样式(TopBar/卡片/按钮/表格/徽章等)
    rule-detail.css     # 规则详情页(1.2)专属样式
  components/
    icons/Icon.vue       # 统一图标组件
    layout/              # TopBar、Breadcrumb
    common/              # 徽章/表单等通用组件(PriorityChip、SeriesTag、
                          # CategoryChip、ToggleSwitch、FormField)
    rules/                # 判定规则模块专属组件(SubTabs、FilterBar、
                          # RulesTable、SSeriesBanner、ThresholdPreview、
                          # ManualCollapse、SavedBanner)
  views/
    rules/RulesListPage.vue    # 页面 1.1
    rules/RuleDetailPage.vue   # 页面 1.2
    PlaceholderPage.vue        # 其余模块的占位页
  data/
    rules-data.js / func-map.js / rule-manual.js / threshold-map.js  # mock 数据
    rules-api.js         # 数据访问层 —— 未来接入真实接口时只需改这一个文件,
                          # 上层页面组件不需要任何改动
  router/index.js         # 路由配置
```

## 数据接口设计说明

当前 `src/data/rules-api.js` 中的所有函数(`fetchRules`、`updateRule`、
`fetchRuleManual`、`fetchThresholdMap` 等)都返回 `Promise`,内部实现暂时读取
本地 mock 数据。未来接入真实后端接口时,只需把这些函数内部换成
`fetch()` / `axios` 调用,函数签名保持不变,页面组件无需任何改动。

## 开发

```bash
npm install
npm run dev       # 本地开发
npm run build     # 生产构建
npm run preview   # 预览构建产物
```

## 分支策略

- `main`:稳定分支
- `dev`:日常开发分支,所有调整先合入此分支
