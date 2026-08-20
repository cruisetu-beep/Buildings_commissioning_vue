# 判定结果 v2 页面 · 验证脚手架

对应交接说明第五节。**不装依赖，`node scripts/verify/run.mjs` 直接跑。**

```
node scripts/verify/run.mjs            # 跑全部
node scripts/verify/run.mjs --update   # 重写快照（确认差异是预期的之后再用）
```

## 它验什么

| | 内容 | 能抓住的错 |
|---|---|---|
| ② | 模板渲染 | 占位符拼错、vals 没给字段（渲染出 `{xxx}` / `undefined` / `NaN`） |
| ③ | 判定一致性 | `stepPassed` 的 key 没接上（返回 null）、判定方向写反 |
| ④ | 快照 | 无意改坏已上线规则：解析结果、渲染文案、图上画出的线，逐值比对 |
| — | 边界用例 | `cases.json`，构造 metrics 锁住每个 key 的比较方向 |

第五节第 1 步（手算复现 metrics）是逐规则的数学，接入时手工做，这里不假装自动化。

## 为什么把逻辑从 .vue 里切出来而不是重写

`extract.mjs` 用锚点把 `vals` 与 `stepPassed` 的函数体原样切出、包一层 `{value}` 壳子当模块用。
**判定逻辑被复刻成两份，正是 `residual` 那次事故的成因**（`stepPassed` 里 key 重复定义，
AA-S2/BA-S2 的 ✓ 被显示成 ✕）——测试里再抄一遍就等于把同一个坑挖两次。
组件若挪动了锚点，`extract.mjs` 会直接抛错，不会静默失效。

## 加规则时

1. 往 `fixtures/` 放真实 payload，**触发与正常各至少一个**（只有触发样本时，方向写反也全绿）。
2. 往 `cases.json` 加新 key 的边界用例，含一条「方向写反就会挂」的。
3. `node scripts/verify/run.mjs` —— 新 fixture 会自动建快照，已有的必须保持不变。

## 现状缺口

**已上线的其余 14 条规则没有 fixture，回归基线是空的。**
它们的 payload 在上一轮交接中随沙盒 `/tmp` 一起丢了。补齐前，
任何改到共用代码的改动（比如日对表格、`norm()`）都只能靠人工复核。
