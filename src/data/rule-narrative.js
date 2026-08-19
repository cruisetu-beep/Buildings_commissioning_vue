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
                                     kind "test"   = 判据行（比阈值，需 key）
     foot.triggered / normal       判定依据表的结语
     causes                        建议核查，取自手册「关键参数工程学依据」。两种写法：
                                     ① 字符串数组 —— 该规则只有一种故障模式，恒显示
                                     ② 分组数组 [{ whenFalse, title, items }] ——
                                        规则有多种故障模式时用，仅在后端
                                        metrics[whenFalse] === false 时显示该组
     readHint                      各视图的读图锚点，按视图名取

   ⚠ 只放后端能算出来的事实与手册原文，不放分析结论。
     判断标准：这句话能否只用 resultJSON 的字段 + 手册原文写出来？
     不能，就别写——晨启预冷、时段定位这类结论正是因此被拿掉的。

   ⚠ 关于判定依据表的 ✓/✕ 语义（当前不统一，已知并暂时接受）
     ✓/✕ 只回答一件事：实测值是否满足同一行「要求」列所写的条件。
     但各规则「要求」列写的东西性质不同：
       C01  写触发条件（≥0.55）      → ✓ 指向触发
       D05  取后端 metrics.passed 反转 → ✓ 指向触发
       D02  写合格线（≥0.60）        → ✓ 指向正常
     所以跨规则切换时同一个 ✓ 可能代表相反的意思，靠「要求」列文字
     和表尾结语消歧。想统一成"一律写合格条件、✓ 一律表示达标"的话，
     D05 是拦路虎：它的判定方向按业态分组而不同，而后端只给了
     groupThreshold 没给方向。需后端补方向字段后再统一。
     新增规则时请照抄最接近的那条的写法，不要自创第三种语义。

   ── 新增一条规则的步骤 ──
   1. 照 C01 的形状写一个常量，句式里的 {xxx} 对应 RuleDetailAreaV2
      的 vals 对象；vals 目前由 A 类（聚类）的 resultJSON 解析而来，
      新的可视化类型需要同步在该组件里扩充 vals 的取值。
   2. 每个 kind:"test" 的 step 要给 key，并在 RuleDetailAreaV2 的
      stepPassed() 里补上对应的比较逻辑。
   3. 注册进下方 NARRATIVES；编号大小写、空格、连字符会自动归一化。
   4. causes 抄手册原文的故障名。若要加解释性的后半句，需专业复核后
      再入库——C01 现有三条的后半句尚未经过复核。
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
  readHint: {
    time: "三天叠放在同一条时刻轴上；每条线是一天。",
    dist: "横轴电耗是聚类实际作用的唯一维度；纵轴时刻只为把采样点摊开，不参与聚类。",
  },
};

/* ── D05 工作日/周末/节假日耗电差异判定（CR0018 · E 类作息日对）──
   注意两点：
   1. 不使用 metrics.eWork / eHol。二者恰为 hourlyProfiles 积分的 4 倍
      （后端疑似把 96 个 15 分钟读数直接求和），显示出来会与图对不上。
      R 是比值，4 倍约掉，照用。
   2. 判定方向按业态分组而不同（间歇型 R 过高触发、客流型偏低触发…），
      所以句子里不写"高于/低于门槛"，方向交给判定依据表的 ✓/✕，
      而那一格直接取后端 metrics.passed，不由前端复算。 */
const D05 = {
  narrative: {
    triggered:
      "节假日 {holDate}（{holWeek}）与同温工作日 {wdDate}（{wdWeek}）相比，" +
      "两天日均温度为 {holTemp} °C 与 {wdTemp} °C、相差 {tDelta} °C。" +
      "节假日全天用电为工作日的 <b>{residual}</b>（{group}组门槛 {residualThreshold}）。" +
      "工作日日间峰值 <b>{wdPeak} kW</b>、夜间低谷 {wdBase} kW；节假日全天在 {holBase} – <b>{holPeak} kW</b> 之间。",
    normal:
      "节假日 {holDate}（{holWeek}）与同温工作日 {wdDate}（{wdWeek}）相比，" +
      "节假日全天用电为工作日的 <b>{residual}</b>，未触发 {group}组的 {residualThreshold} 门槛。",
  },
  title: { triggered: "节假日用电未随作息回落", normal: "节假日用电已随作息回落" },
  steps: [
    {
      kind: "stated",
      what: "配对同温日",
      sub: "为节假日匹配温度最接近的工作日，排除天气差异带来的干扰",
      val: "{wdDate} / {holDate}",
      req: "—",
    },
    {
      kind: "test",
      what: "两天温度够不够接近",
      sub: "日均干球温度之差，超出则这一对不可比",
      val: "{tDelta} °C",
      req: "≤ {tThreshold} °C",
      key: "tempMatch",
    },
    {
      kind: "test",
      what: "空载能耗残留率",
      sub: "节假日全天用电占同温工作日的比例（{group}组）",
      val: "{residual}",
      req: "门槛 {residualThreshold}",
      key: "residual",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 取自手册 D05 节（原规则 3+15）的工程学依据，未添加解释性补充 */
  causes: [
    "节假日未切换至值班模式，冷热源与输配设备按工作日时间表运行",
    "楼宇自控时间表未录入法定节假日日历",
    "新风机组或排风机全天定频运行，无节假日降载策略",
  ],
  readHint: {
    day: "两条曲线是同温的一个工作日和一个节假日；节假日曲线下的面积占工作日面积的比例，就是空载残留率。",
  },
};

/* ── D02 分业态气象敏感度（温升-能耗斜率）判定（CR0020 · B 类回归）──
   手册（v4 §D02 步骤 3）定义的是**串联**判据，且对应两种不同故障：
     R² < 0.60                → 控制管理混乱
     R² ≥ 0.60 且 k > k_limit → 新风比例超标或围护结构热阻劣化
   所以 causes 必须按失效判据分组，否则会给 R² 不达标的楼推送
   "新风阀开度过大"这类完全无关的核查方向。
   ✓/✕ 直接取后端 metrics.r2Passed / slopePassed，前端不复算。 */
const D02 = {
  narrative: {
    triggered:
      "{start} 至 {end} 的制冷季，取室外干球温度在 {tMin}–{tMax} °C 之间的 <b>{n}</b> 个逐时点做线性回归，" +
      "得到 <b>{formula}</b>。温度每升高 1 °C，空调用电增加 <b>{slope} kW</b>；" +
      "用电随温度变化的规律性为 <b>{r2}</b>。",
    normal:
      "{start} 至 {end} 的制冷季，取室外干球温度在 {tMin}–{tMax} °C 之间的 <b>{n}</b> 个逐时点做线性回归，" +
      "得到 <b>{formula}</b>。用电随温度变化的规律性为 <b>{r2}</b>，敏感度斜率 <b>{slope} kW/°C</b>，两项均在要求范围内。",
  },
  title: { triggered: "能耗与气象的关系不符合要求", normal: "能耗随气象变化正常" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "制冷季逐时数据中，室外干球温度落在 {tMin}–{tMax} °C 区间的样本",
      val: "{n} 个逐时点",
      req: "—",
    },
    {
      kind: "test",
      what: "用电随温度变化的规律性（R²）",
      sub: "室外温度相同时用电是否稳定，越低说明开关机越无规律",
      val: "{r2}",
      req: "≥ {r2Threshold}",
      key: "r2",
    },
    {
      kind: "test",
      what: "气象敏感度（斜率 k）",
      sub: "室外温度每升高 1 °C，空调用电增加多少",
      val: "{slope} kW/°C",
      req: "≤ {slopeLimit}",
      key: "slope",
    },
  ],
  foot: {
    triggered: "有判据未达要求 → 判定为 <b>目标调适</b>",
    normal: "两项判据均达要求 → 判定为 <b>正常</b>",
  },
  causes: [
    {
      whenFalse: "r2Passed",
      title: "随温度变化的规律性不足（控制管理混乱）",
      items: [
        "系统开关机无规律，运行不随室外气象条件调整",
        "同一温度下运行状态差异悬殊，缺少统一的群控策略",
      ],
    },
    {
      whenFalse: "slopePassed",
      title: "气象敏感度过高（新风或围护）",
      items: [
        "新风阀开度过大或无级调速失效",
        "新风旁通泄漏、新风比失控",
        "围护结构隔热性能劣化",
      ],
    },
  ],
  readHint: {
    scat: "每个点是一个小时的（室外干球温度，空调用电）；红线是最小二乘拟合出的能学签名。",
  },
};

/* ── BA-S1 商业写字楼：加班夜间小负荷群控策略缺失（CR0034 · E 类单曲线）──
   与 D05 同为 E 类，但形态不同：只有一条日曲线（holiday 为 null），
   metrics 换了一套字段（frac / pMid / pMax / threshold / algo）。

   ⚠ 分母口径与手册不一致，措辞已相应回避：
     手册写的是 P_HVAC_max ——「该建筑设计最大空调负荷功率」，同一栋楼
     应为固定值；但后端三个窗口给出 60.2 / 246.64 / 10.56 kW，相差 23 倍，
     取的显然是各窗口自身的观测峰值。所以文案只说「当日系统最大功率」，
     不说「设计最大负荷」，以免把后端没算的东西写成算过的。 */
const BA_S1 = {
  narrative: {
    triggered:
      "{date}（{selectionReason}）后半夜 23:00–04:00 的平均功率为 <b>{pMid} kW</b>，" +
      "相当于当日系统最大功率 {pMax} kW 的 <b>{frac}</b>。" +
      "当日逐时功率在 {dayMin} – {dayMax} kW 之间。",
    normal:
      "{date}（{selectionReason}）后半夜 23:00–04:00 的平均功率为 <b>{pMid} kW</b>，" +
      "为当日系统最大功率 {pMax} kW 的 <b>{frac}</b>，未超过 {threshold} 的门槛。",
  },
  title: { triggered: "夜间功率未随负荷回落", normal: "夜间功率已随负荷回落" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "典型工作日 {date} 的逐时功率，取 23:00 至次日 04:00 时段求平均",
      val: "夜间平均 {pMid} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "夜间维持功率比",
      sub: "后半夜平均功率占当日系统最大功率 {pMax} kW 的比例",
      val: "{frac}",
      req: "> {threshold}",
      key: "frac",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 取自手册 BA-S1「重构方案与物理原理」及「关键参数工程学依据」段 */
  causes: [
    "中央群控未做分区控制策略，主机与大型水泵仍全频工频输出",
    "未实行分区阀门群控连锁，零星加班导致整站满负荷运行",
  ],
  readHint: {
    day: "紫色区间是算法的取数时段（23:00 至次日 04:00，跨零点故分列首尾）；两条虚线分别是该时段的平均功率与当日系统最大功率。",
  },
};

/* BC-S1（CR0038）。✓/✕ 语义照抄 BA-S1：「要求」列写触发条件，✓ 指向触发。
   数据源按 requiredNodeTypes = U2A01,U2A02 写作「冷冻泵 + 冷却泵」——
   payload 里 resultMd 写 U2000、手册写 U2000+U2B02，三者不一致，已挂问题清单。
   注意 pPeak 是 11:00–15:00 的时段均值，不是当日峰值（窗口1 当日最高
   123.91 kW 落在 15:00，在取数窗口之外），文案必须写明时段。 */
const BC_S1 = {
  narrative: {
    triggered:
      "{date}（{selectionReason}）冷冻泵与冷却泵在深夜 01:00–05:00 的平均功率为 <b>{pLow} kW</b>，" +
      "白天高峰 11:00–15:00 的平均功率为 <b>{pPeak} kW</b>，两者之比 NDR = <b>{ndr}</b>。" +
      "当日逐时功率在 {dayMin} – {dayMax} kW 之间。",
    normal:
      "{date}（{selectionReason}）冷冻泵与冷却泵在深夜 01:00–05:00 的平均功率为 <b>{pLow} kW</b>，" +
      "白天高峰 11:00–15:00 的平均功率为 <b>{pPeak} kW</b>，两者之比 NDR = <b>{ndr}</b>，" +
      "未超过 {threshold} 的门槛。",
  },
  title: { triggered: "深夜泵功率相对白天回落不足", normal: "深夜泵功率已明显回落" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "典型运行日 {date} 的冷冻泵与冷却泵逐时功率，分别取 01:00–05:00 与 11:00–15:00 求平均",
      val: "深夜 {pLow} kW · 白天 {pPeak} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "深夜能耗比 NDR",
      sub: "深夜低谷段平均功率占白天高峰段平均功率的比例",
      val: "{ndr}",
      req: "> {threshold}",
      key: "ndr",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 取自手册 BC-S1「重构方案与物理原理」及「关键参数工程学依据」段。
     ⚠ 手册这两条讲的是新风机组，与本规则实际喂入的泵功率不是同一件事；
       手册 BC 章节表格行自己写的是「凌晨 2-6 点冷冻泵未降频」，与数据源吻合。
       手册内部不自洽，已挂问题清单，此处先照详细段落原文入库。 */
  causes: [
    "宴会厅、大堂、商场等公共区域的大型新风机组（AHU/PAU）深夜未及时关机或降频",
    "深夜手工关闭失效或时间表漂移，新风阀长跑导致冷量泄露与风机空转",
  ],
  readHint: {
    day: "两片底纹是算法的两个取数时段（深夜 01:00–05:00、白天高峰 11:00–15:00）；两条虚线是各自时段的平均功率，NDR 即下面那条除以上面那条。",
  },
};

/* 已填写的规则；未填写的返回 null，页面据此隐藏叙述层但保留图表 */
const NARRATIVES = {
  C01,
  CR0016: C01, // 同一条规则的两种编号写法
  D05,
  CR0018: D05,
  D02,
  CR0020: D02,
  "BA-S1": BA_S1,
  CR0034: BA_S1,
  "BC-S1": BC_S1,
  CR0038: BC_S1,
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
