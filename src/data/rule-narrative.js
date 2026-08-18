/* ═══════════════════════════════════════════════════════════════
   规则叙述模板（判定结果 v2 页面专用）

   方案 C：每条规则一套带占位符的句式，前端只负责把 resultJSON
   里的实测值填进去，不做任何推断。将来这四个字段搬到后端
   T_ST_CxRuleMeta，本文件换成 getRuleNarrative(ruleCode) 接口取数。

   字段说明：
     narrative.triggered / normal  L0 一句话结论（占位符 {key}）
     title.triggered / normal      结论卡标题
     steps[]                       判定依据表，变长，忠实于手册条件数
                                     kind "stated" = 陈述行（无阈值）
                                     kind "test"   = 判据行（比阈值）
     causes[]                      建议核查，取自手册「关键参数工程学依据」
     caliber                       数据口径提醒
     readHint                      各视图的读图锚点

   ⚠ 只放后端能算出来的事实与手册原文，不放分析结论。
   ═══════════════════════════════════════════════════════════════ */

const C01 = {
  narrative: {
    triggered:
      "{start} 至 {end} 这 {days} 天，室外温度都在 <b>{temp} °C</b>、工况几乎相同。" +
      "空调白天的用电分成明显两档：低档平均 <b>{mu1} kW</b>、高档平均 <b>{mu2} kW</b>，相差 <b>{delta}</b>。",
    normal:
      "{start} 至 {end} 这 {days} 天，室外温度都在 <b>{temp} °C</b>。空调白天的用电虽有高低起伏，" +
      "但两档平均只差 <b>{delta}</b>，没有达到 {deltaThreshold} 的判定门槛。",
  },
  title: { triggered: "设备存在高低双工况", normal: "未发现双工况迹象" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "工作日日间、室外干球 {temp}±{tempDelta} °C 的等温切片",
      val: "{n} 个采样点",
      req: "—",
    },
    {
      kind: "test",
      what: "两档分得够不够开",
      sub: "按用电高低分成两堆，度量分离程度（轮廓系数）",
      val: "{sil}",
      req: "≥ {silThreshold}",
      key: "sil",
    },
    {
      kind: "test",
      what: "两档差距够不够大",
      sub: "高档比低档的平均功率高出多少",
      val: "{delta}",
      req: "≥ {deltaThreshold}",
      key: "delta",
    },
    {
      kind: "test",
      what: "排除「开机 vs 停机」",
      sub: "低档簇心须高于系统待机功率，确认两档都在运行状态",
      val: "{mu1} kW",
      req: "高于待机功率",
      key: "standby",
    },
  ],
  foot: {
    triggered: "判据全部满足 → 判定为 <b>目标调适</b>",
    normal: "判据未全部满足 → 判定为 <b>正常</b>",
  },
  causes: [
    "变频器被锁定在常频运行，机组无法随负荷调节",
    "冷冻泵或冷却泵主备同时启动，形成阶跃式功率台阶",
    "旁通阀卡死导致旁通流量常开，主机被迫高负荷补偿",
  ],
  caliber:
    "本规则取空调系统总表（U2000）口径，无法定位到单台设备；上述原因需现场按冷机、水泵、阀门逐台核对。",
  readHint: {
    time: "三天叠放在同一条时刻轴上；每条线是一天。",
    dist: "横轴电耗是聚类实际作用的唯一维度；纵轴时刻只为把采样点摊开，不参与聚类。",
  },
};

/* 已填写的规则；未填写的返回 null，页面据此隐藏叙述层但保留图表 */
const NARRATIVES = {
  C01,
  CR0016: C01, // 同一条规则的两种编号写法
};

/* 后端 ruleCode 可能带前后缀或大小写差异，做一次归一化再匹配 */
function normalize(code) {
  return String(code).trim().toUpperCase().replace(/[\s_-]/g, "");
}
const NORMALIZED = Object.fromEntries(Object.entries(NARRATIVES).map(([k, v]) => [normalize(k), v]));

export function getRuleNarrative(code) {
  if (!code) return null;
  return NORMALIZED[normalize(code)] || null;
}

/* 把模板里的 {key} 换成 vals 里的值；缺值时原样保留，便于发现漏字段 */
export function fillTemplate(tpl, vals) {
  if (typeof tpl !== "string") return "";
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vals[k] === undefined || vals[k] === null ? m : vals[k]));
}
