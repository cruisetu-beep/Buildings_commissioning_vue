# fixture 说明

每个文件是**一个窗口**的真实后端返回，直接从接口响应里摘 `windows[i]` 那一层。
数值一律不得手改——手改过的样本会让快照失去意义。

```jsonc
{
  "ruleCode": "C08",           // 用于 getRuleNarrative 查模板
  "buildId": "310101B002",
  "note": "真实后端 payload，勿手改数值",
  "window": {                  // 原样照抄 windows[i]
    "calcResult": {
      "category": "目标调适",   // 判定一致性的比对基准
      "resultJson": "{...}"    // 字符串，不是对象
    }
  }
}
```

命名：`{ruleCode}_{cxRuleId}_{buildId}_{触发|正常}.json`。
**每条规则至少要有一个触发样本和一个正常样本**——只有触发样本时，
判定方向写反了也能全绿（`residual` 那次就是这么漏过去的）。

## 现状缺口

目前只有 C08 的两个窗口。已上线的其余 14 条规则（C01/C02/C03/C04/C06/C07/
D02/D05/AA-S1/AA-S2/AA-S3/BA-S1/BA-S2/BB-S1/BC-S1）**没有 fixture**，
它们的回归基线是空的。补齐前，任何改到共用代码的改动都无法自动验证。
