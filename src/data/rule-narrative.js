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

/* C03（CR0021）。第一条反向判据（R < 1/3 触发）。
   ✓/✕ 照抄 D05：取后端 metrics.passed（false = 触发），不自己比大小——
   R 可能为负（泵不是涨得少，是反而降了），符号方向自己比容易写错。
   「要求」列写触发条件，✓ 指向触发，与 C01 / BA-S1 / BC-S1 同向。
   温度只有窗口级字符串 meteoCondition（如「干球升4.0℃」），
   payload 里没有 Day A / Day B 的日均温数值，已挂问题清单。 */
const C03 = {
  narrative: {
    triggered:
      "{dayA} → {dayB}（{meteo}）冷冻泵日电耗从 <b>{pumpA} kWh</b> 变为 <b>{pumpB} kWh</b>（{dPump}），" +
      "同期冷水主机从 <b>{chillerA} kWh</b> 变为 <b>{chillerB} kWh</b>（{dChiller}）。" +
      "两者涨幅之比 R = <b>{r}</b>。",
    normal:
      "{dayA} → {dayB}（{meteo}）冷冻泵日电耗从 <b>{pumpA} kWh</b> 变为 <b>{pumpB} kWh</b>（{dPump}），" +
      "同期冷水主机从 <b>{chillerA} kWh</b> 变为 <b>{chillerB} kWh</b>（{dChiller}）。" +
      "两者涨幅之比 R = <b>{r}</b>，未低于 {threshold} 的门槛。",
  },
  title: { triggered: "冷冻泵电耗未跟随主机上涨", normal: "冷冻泵电耗随主机同步上涨" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "连续升温日对 {dayA} → {dayB}（{meteo}），分别取冷冻泵（U2A01）与冷水主机（U2A00）的日总电耗",
      val: "泵 {pumpA} → {pumpB} kWh · 机 {chillerA} → {chillerB} kWh",
      req: "—",
    },
    {
      kind: "stated",
      what: "各自涨幅",
      sub: "以升温前那天为基数，计算两个节点的相对变化率",
      val: "泵 {dPump} · 机 {dChiller}",
      req: "—",
    },
    {
      kind: "test",
      what: "输配-冷源响应比 R",
      sub: "泵的相对涨幅除以主机的相对涨幅",
      val: "{r}",
      req: "< {threshold}",
      key: "r",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 取自手册 C03「关键参数工程学依据」。第 3 条严格说是排查动作而非故障原因，
     但它正是区分前两条的手段，放在「建议核查」里合适（已与规则负责人确认）。 */
  causes: [
    "水泵为定频运行，末端阀门开大使阻力曲线右移，电耗仅微增（通常 <5%）",
    "水泵严重过流选型，低负荷时已达出力顶峰，高负荷时无法再升频",
    "核对水泵运行频率日志：长期钉死在最低限（30~35Hz）多为选型过大或末端负荷率过低；处于中高频段（>40Hz）却无跟随响应则为变频控制策略缺陷",
  ],
  readHint: {
    slope:
      "两条线都以升温前那天为 100% 起点，斜率就是各自的涨幅。虚线是手册要求冷冻泵至少应达到的位置（主机涨幅的 1/3），泵线落在虚线下方即触发。",
  },
};

/* AA-S2（CR0032）。⚠ 本条与其他规则不同：**手册两版都没有正文**。
   v4 的 S 系只有五条标「✅ 已重构」的写了正文，AA-S2 属于「v2 原文保留」，
   而 v2.1 第三章从头到尾只有表格，S 系一条正文都没有。
   因此 causes 无原文可抄，按约定一不自行编写故障机理，只列后端
   judgmentStandard 里那句判定口径。等规则负责人补正文后再填，纯增量。

   数据源按 requiredNodeTypes = U2A01,U2A02,U2B01 写作「冷冻泵、冷却泵与
   全空气机组」——resultMd 又写 U2000，与 BC-S1 同一类冲突，已挂问题清单。
   标签用「假日」不用「法定节假日」：三个窗口选到的都是周末。
   ✓/✕ 写触发条件、指向触发，与 C01 / BA-S1 / BC-S1 同语义。 */
const AA_S2 = {
  narrative: {
    triggered:
      "工作日（{wdDate}）冷冻泵、冷却泵与全空气机组的逐时功率在 " +
      "{wdBase} – {wdPeak} kW 之间，{holName}（{holDate}）为 {holBase} – {holPeak} kW。" +
      "{holName}全天电耗占工作日的 <b>{residual}</b>。",
    normal:
      "工作日（{wdDate}）冷冻泵、冷却泵与全空气机组的逐时功率在 " +
      "{wdBase} – {wdPeak} kW 之间，{holName}（{holDate}）为 {holBase} – {holPeak} kW。" +
      "{holName}全天电耗占工作日的 <b>{residual}</b>，未超过 {residualThreshold} 的门槛。",
  },
  title: { triggered: "{holName}电耗未退到应有水平", normal: "{holName}电耗已明显退避" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "一对工作日与{holName}（{selectionReason}）各 24 小时的逐时功率",
      val: "工作日 {wdBase} – {wdPeak} kW · {holName} {holBase} – {holPeak} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "空载能耗残留率 R",
      sub: "{holName}全天电耗占工作日全天电耗的比例",
      val: "{residual}",
      req: "> {residualThreshold}",
      key: "residual",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 唯一一条，出处是后端 judgmentStandard，不是手册。其余留空走组件兜底。 */
  causes: ["节假日未执行退避策略（后端判定口径，手册暂无该规则正文）"],
  readHint: {
    day: "两条曲线是同一栋楼在工作日与{holName}的 24 小时逐时功率，曲线下的面积就是各自的全天电耗，两块面积之比即残留率 R。",
  },
};

/* BA-S2（CR0035）。与 AA-S2 同算法（DayPairResidual），阈值不同（0.7 vs 0.3），
   同样**手册两版都没有正文**，causes 只列后端 judgmentStandard 一条。
   照约定「照抄最接近的那条」整份写开，不与 AA_S2 共用对象——
   这是数据文件，后续多由非作者直接改字，共用会造成改一处动两条。

   数据源措辞：requiredNodeTypes = U2A01,U2A02,U2A00，但 modelNodes 的
   parentNodeId 表明 U2A00 冷热站是 U2A01/U2A02 的**父节点**，三者相加会把
   两个泵算两遍。故按层级写作「冷热站（含冷冻泵、冷却泵）」，只复述
   payload 自己的父子关系，不断言求和口径。已挂问题清单。
   ⚠ 同一问题牵连 C03：C03 把 U2A00 当「冷水主机」做分母，若它实为含泵的
   冷热站总表，那 R 算的是「部分 ÷ 整体」，需后端确认。 */
const BA_S2 = {
  narrative: {
    triggered:
      "工作日（{wdDate}）冷热站（含冷冻泵、冷却泵）的逐时功率在 " +
      "{wdBase} – {wdPeak} kW 之间，{holName}（{holDate}）为 {holBase} – {holPeak} kW。" +
      "{holName}全天电耗占工作日的 <b>{residual}</b>。",
    normal:
      "工作日（{wdDate}）冷热站（含冷冻泵、冷却泵）的逐时功率在 " +
      "{wdBase} – {wdPeak} kW 之间，{holName}（{holDate}）为 {holBase} – {holPeak} kW。" +
      "{holName}全天电耗占工作日的 <b>{residual}</b>，未超过 {residualThreshold} 的门槛。",
  },
  title: { triggered: "{holName}冷水系统未卸载", normal: "{holName}冷水系统已卸载" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "一对工作日与{holName}（{selectionReason}）各 24 小时的逐时功率",
      val: "工作日 {wdBase} – {wdPeak} kW · {holName} {holBase} – {holPeak} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "空载能耗残留率 R",
      sub: "{holName}全天电耗占工作日全天电耗的比例",
      val: "{residual}",
      req: "> {residualThreshold}",
      key: "residual",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 唯一一条，出处是后端 judgmentStandard，不是手册。其余留空走组件兜底。 */
  causes: ["周末无人时段冷水系统未卸载（后端判定口径，手册暂无该规则正文）"],
  readHint: {
    day: "两条曲线是同一栋楼在工作日与{holName}的 24 小时逐时功率，曲线下的面积就是各自的全天电耗，两块面积之比即残留率 R。",
  },
};

/* AA-S1（CR0031）。手册正文完整（v4「✅ 已重构」），causes 取自
   「重构方案与物理原理」与「关键参数工程学依据」两段原文。
   ⚠ 手册这条的 CxRuleID 仍写 CR0029——是全书唯一的错号，实际为 CR0031，
   v2.1 手册两处均写对，以 v2.1 与生产库为准。

   ⚠ 夜间段跨零点：算法取「本日 21:00–24:00 + 次日 00:00–05:00」，
   hourlyProfiles 只有本日，5/8 的取数不在图上。已验证 eDay == Σ(08–17)×4
   精确成立，而 eNight 扫遍所有窗口均无匹配。故底纹只标图上真有的两段，
   readHint 必须点破这件事——否则窗口3 会出现「夜间基准线明显高于图上
   00–05 曲线」的视觉矛盾而无从解释。

   eDay/10 与 eNight/8 是逐时积分的 4 倍（第四次复现），一概不用；
   文案里的 kW 是 parseSchedule 换算出的真实值。
   数据源按 requiredNodeTypes = U2A01,U2A02,U2B01 写；resultMd 又写 U2000。
   ✓/✕ 写触发条件、指向触发，与 C01 / BA-S1 / BC-S1 同语义。 */
const AA_S1 = {
  narrative: {
    triggered:
      "{date}（{selectionReason}）冷冻泵、冷却泵与全空气机组在日间 08:00–18:00 的平均功率为 " +
      "<b>{dayAvg} kW</b>，夜间 21:00 至次日 05:00 为 <b>{nightAvg} kW</b>，" +
      "待机功率比 SR = <b>{sr}</b>。当日逐时功率在 {dayMin} – {dayMax} kW 之间。",
    normal:
      "{date}（{selectionReason}）冷冻泵、冷却泵与全空气机组在日间 08:00–18:00 的平均功率为 " +
      "<b>{dayAvg} kW</b>，夜间 21:00 至次日 05:00 为 <b>{nightAvg} kW</b>，" +
      "待机功率比 SR = <b>{sr}</b>，未超过 {threshold} 的门槛。",
  },
  title: { triggered: "夜间功率未退到待机水平", normal: "夜间功率已退到待机水平" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "典型工作日 {date} 的日间工作段（08:00–18:00，10 小时）与深夜非工作段（21:00 至次日 05:00，8 小时）",
      val: "日间 {dayAvg} kW · 夜间 {nightAvg} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "深夜待机功率比 SR",
      sub: "夜间时段平均功率占日间工作段平均功率的比例",
      val: "{sr}",
      req: "> {threshold}",
      key: "sr",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 手册 AA-S1「重构方案与物理原理」+「关键参数工程学依据」原文 */
  causes: [
    "暖通末端存在人员离席未关现象，或群控 schedules 策略失效",
    "夜间系统未按机关办公刚性作息（08:00–18:00）切断或进入待机锁定状态",
    "后半夜持续残留超过白天均值 30%，需排查「彻夜长明」或线损；正常机关办公建筑夜间 SR 应 ≤ 15%，该基准已包容消防应急末端与自控面板的待机耗电",
  ],
  readHint: {
    day:
      "橙色底纹是日间取数段（08:00–18:00），两条虚线是日间与夜间的平均功率，SR 即下面那条除以上面那条。" +
      "紫色底纹只标到 24:00：算法的夜间段跨零点，00:00–05:00 取的是次日数据，不在本图内——" +
      "因此夜间基准线不必与图上凌晨那段曲线吻合。",
  },
};

/* C02（CR0019）。⚠ 判据方向存疑，已知并保留（按现状实现，后端后续统一调整）：
   手册 264 行定义 Δη = (E_A − E_B)/E_A，即**电耗下降时 Δη 为正**；
   而判定准则写「Δη ≥ −5%（即降幅不足 5%）触发」。这两句方向相反——
   按该定义，「降幅不足 5%」应为 Δη < 5%。现行条件除非逆势上涨超 5%
   否则恒成立，故电耗大幅下降的窗口也会触发。

   因此本模板只陈述实测事实（湿球降了多少、各节点与合计变化多少），
   ✓/✕ 一律取后端布尔，不写「响应良好/失效」这类方向判断，
   也不在图上画合格线——那等于替后端选一种解释。
   判据方向厘清后，需要改的是 title 与 req 两处措辞。

   ⚠ 合计口径：modelNodes 显示 U2A02 / U2A04 是 U2A00 的子节点，
   手册的 E_reject = U2A00 + U2A02 + U2A04 把冷却泵与冷却塔各算两遍，
   且 U2A00 占合计 87–89%，实测「散热侧」基本等于整个冷热站。
   前端如实复述后端合计，不自行改口径。 */
const C02 = {
  narrative: {
    triggered:
      "{dayA} → {dayB}，室外湿球温度由 <b>{meteoA}{meteoUnit}</b> 降至 <b>{meteoB}{meteoUnit}</b>" +
      "（降 {meteoDrop}{meteoUnit}）。同期散热侧 {nodeCount} 个节点合计电耗由 " +
      "<b>{totalA} kWh</b> 变为 <b>{totalB} kWh</b>，相对变化率 Δη = <b>{deltaEta}</b>" +
      "（Δη 为正表示电耗下降）。",
    normal:
      "{dayA} → {dayB}，室外湿球温度由 <b>{meteoA}{meteoUnit}</b> 降至 <b>{meteoB}{meteoUnit}</b>" +
      "（降 {meteoDrop}{meteoUnit}）。同期散热侧 {nodeCount} 个节点合计电耗由 " +
      "<b>{totalA} kWh</b> 变为 <b>{totalB} kWh</b>，相对变化率 Δη = <b>{deltaEta}</b>" +
      "（Δη 为正表示电耗下降），未落入触发区间。",
  },
  title: { triggered: "散热侧电耗变化率落入触发区间", normal: "散热侧电耗变化率未落入触发区间" },
  steps: [
    {
      kind: "test",
      what: "湿球降幅",
      sub: "选窗前提：日均湿球温度较前一日的降幅",
      val: "{meteoDrop}{meteoUnit}",
      req: "≥ {meteoThreshold}{meteoUnit}",
      key: "meteo",
    },
    {
      kind: "stated",
      what: "取数据",
      sub: "散热侧 {nodeCount} 个节点（冷热站、冷却泵、冷却塔）的日总电耗合计",
      val: "{labelA} {totalA} kWh · {labelB} {totalB} kWh",
      req: "—",
    },
    {
      kind: "test",
      what: "散热侧电耗相对变化率 Δη",
      sub: "(降温前 − 降温后) ÷ 降温前，为正表示电耗下降",
      val: "{deltaEta}",
      req: "≥ {threshold}",
      key: "eta",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 手册 C02「物理原理」+「关键参数工程学依据」原文 */
  causes: [
    "散热侧变频失效——冷却塔风机未随湿球下降降频",
    "冷凝器结垢严重，湿球下降带来的冷凝压力收益无法传导到主机电耗",
    "系统发生大流量小温差的水力对冲",
    "核对前提条件：本判据成立需冷机运行负荷高于最小卸载比（>15%~25%）且未处于频繁启停循环",
  ],
  readHint: {
    slope:
      "各节点与合计都以降温前那天为 100% 起点，线的落差就是各自的电耗变化。" +
      "粗线是判据看的合计，细虚线是分项——可以看出是哪一侧在响应、哪一侧没动。" +
      "图上不画合格线：手册对该判据的方向表述与其公式定义不一致，待厘清。",
  },
};

/* C06（CR0025）。第五种可视化类型（D 类 distribution）。
   判据 R = max/min，1.30 < R < 100 触发，上界用于滤传感器故障。
   ✓/✕ 直接比（无 passed 布尔，方向固定），写触发条件、指向触发。

   ⚠ 后端字段名 maxMeanRatio 装的是 max/min 而非 max/mean，且 metrics 里
      没有 min（只在 formulaSubstitution 字符串里），min 由 powerSeries 自算。
   ⚠ powerSeries 是 96 个 15 分钟读数（3 日 × 8h × 4），resultMd 写「逐时」有误，
      故文案只说「样本」不说「小时」。
   ⚠ 结论卡只写 max / min 的数值，不写它们落在第几天第几个点——那是与
      C01「高档时段集中在 2/19 上午」同类的定位句，按约定一交给图去表达。
   ⚠ payload 里算了 cv / cvThreshold 却未接入判据（实测某窗口 CV 0.1314
      低于阈值 0.15 却仍触发）。前端在步骤里以 stated 形式如实列出，
      不参与 ✓/✕，也不暗示它「本应」参与。 */
const C06 = {
  narrative: {
    triggered:
      "{dateFrom} – {dateTo} 的等温窗口（{meteoNote}）内，日间末端风机功率共 {n} 个样本，" +
      "最大 <b>{max} kW</b>、最小 <b>{min} kW</b>，两者之比 R = <b>{ratio}</b>。" +
      "全部样本的均值为 {mean} kW，变异系数 {cv}。",
    normal:
      "{dateFrom} – {dateTo} 的等温窗口（{meteoNote}）内，日间末端风机功率共 {n} 个样本，" +
      "最大 <b>{max} kW</b>、最小 <b>{min} kW</b>，两者之比 R = <b>{ratio}</b>，" +
      "未落入 {ratioThreshold} ~ {ratioUpper} 的触发区间。",
  },
  title: { triggered: "同温窗口内风机功率极差过大", normal: "同温窗口内风机功率离散度正常" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "{dateFrom} – {dateTo} 共 {dayCount} 天，等温窗口（{meteoNote}）日间 09:00–17:00 的全空气机组与新风机组功率合计，{n} 个样本",
      val: "最大 {max} kW · 最小 {min} kW",
      req: "—",
    },
    {
      kind: "stated",
      what: "样本离散情况",
      sub: "均值、标准差与变异系数（后端算出但未接入本规则判据）",
      val: "μ {mean} kW · σ {std} · CV {cv}",
      req: "—",
    },
    {
      kind: "test",
      what: "离散比 R = max / min",
      sub: "同温窗口内最大功率与最小功率之比，上界用于滤除传感器故障",
      val: "{ratio}",
      req: "{ratioThreshold} ~ {ratioUpper}",
      key: "ratio",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 手册 C06「物理原理」+「关键参数工程学依据」原文 */
  causes: [
    "现场存在严重的风机无序手工开停",
    "末端风阀控制链路震荡缺陷，阀门在同一外负荷下反复大幅调节",
    "先排除传感器偶发故障与漂移——手册要求剔除后再判定为控制失控",
  ],
  readHint: {
    seq:
      "横轴是按时间顺序排列的全部样本，竖虚线分隔各天。红点是最大值、紫点是最小值，判据 R 就是这两点之比——" +
      "其余样本不参与计算，所以极值落在序列的什么位置值得留意。",
    hist:
      "每根柱子是一个功率区间内的样本个数，柱形越分散说明同温条件下风机功率波动越大。" +
      "判据只取最左与最右两端的极值，不看中间的形状。",
  },
};

/* C07（CR0027）。与 C02 结构相同（dayPair + 气象数值 + 合计变化率），
   但**判据是自洽的**，与 C02 那个符号问题无关：
     C02  Δη = (E_A − E_B)/E_A  下降为正 ⇒ 判据写 ≥ −5% 与定义矛盾
     C07  Δr = (E_B − E_A)/E_A  下降为负 ⇒ 判据写 > −15% 正确
   差别只在分子前后顺序。故本条可照手册措辞写「降幅不足」，不必像 C02
   那样退到中性表述。

   ⚠ 实测量级极小：采暖泵日电耗 7.20 → 7.60 kWh（日均约 0.30 kW），
      而同一栋楼的冷热站日耗约 10242 kWh。0.4 kWh 的绝对变化已接近计量
      噪声，Δr 的 5.6% 建立在这个基数上。同 C03 的 72.00 kWh 恒定泵读数，
      属同一类问题，已挂问题清单。文案如实写出两个绝对值，读者自行判断。
   ⚠ 后端把 U2A01+U2A05 预先合并为一条 series（不像 C02/C03 逐节点列出），
      故图上只有一条线，无分项可看。
   ✓/✕ 两条判据均取后端布尔（conditionPassed / passed）。 */
const C07 = {
  narrative: {
    triggered:
      "{dayA} → {dayB}，室外日均干球温度由 <b>{meteoA}{meteoUnit}</b> 升至 <b>{meteoB}{meteoUnit}</b>" +
      "（升 {meteoRise}{meteoUnit}）。同期采暖泵日总电耗由 <b>{totalA} kWh</b> 变为 " +
      "<b>{totalB} kWh</b>，相对变化率 Δr = <b>{deltaR}</b>（Δr 为负表示电耗下降）。",
    normal:
      "{dayA} → {dayB}，室外日均干球温度由 <b>{meteoA}{meteoUnit}</b> 升至 <b>{meteoB}{meteoUnit}</b>" +
      "（升 {meteoRise}{meteoUnit}）。同期采暖泵日总电耗由 <b>{totalA} kWh</b> 变为 " +
      "<b>{totalB} kWh</b>，相对变化率 Δr = <b>{deltaR}</b>，降幅已达 {thresholdAbs} 以上。",
  },
  title: { triggered: "采暖泵电耗降幅不足 {thresholdAbs}", normal: "采暖泵电耗已随气温回升下降" },
  steps: [
    {
      kind: "test",
      what: "冬季升温幅度",
      sub: "选窗前提：采暖季连续日对的日均干球温升",
      val: "{meteoRise}{meteoUnit}",
      req: "≥ {meteoThreshold}{meteoUnit}",
      key: "meteo",
    },
    {
      kind: "stated",
      what: "取数据",
      sub: "冷冻(采暖)泵与热水循环泵的日累计电耗合计",
      val: "{labelA} {totalA} kWh · {labelB} {totalB} kWh",
      req: "—",
    },
    {
      kind: "test",
      what: "采暖泵电耗相对变化率 Δr",
      sub: "(升温后 − 升温前) ÷ 升温前，为负表示电耗下降",
      val: "{deltaR}",
      req: "> {threshold}",
      key: "dr",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 手册 C07「物理原理」+「关键参数工程学依据」原文 */
  causes: [
    "采暖输配系统缺乏气候补偿变频控制，循环泵不随室外温升降频",
    "二次侧阀门锁定在大流量状态——水力失衡在采暖季的对称表现",
    "围护结构热损失已显著减小，但输配侧未同步减量",
  ],
  readHint: {
    slope:
      "线以升温前那天为 100% 起点，落差就是采暖泵电耗的相对变化。" +
      "横轴下方标注的是两天的室外干球温度——气温上去了、线却没下来，就是这条规则要抓的情形。",
  },
};

/* C08（CR0028）。C 类日对，比较极寒日与温和日的采暖泵日电耗。
   判据 ΔM = |M_warm − M_cold| / M_cold < 20% 触发（差距太小＝没跟随负荷）。

   ⚠⚠ 判据口径把结论翻转了，文案因此退到中性表述（同 C02 的处理）。
      requiredNodeTypes 是 U2A01 + U2A05，而 U2A01 的 modelNodeName 是
      「冷冻(采暖)泵」——冷侧与热侧相加。实测两栋楼在同一对窗口日上：
        B002  U2A05 热水泵 517.53 → 60.80（降 88.3%，教科书式的负荷跟随）
              U2A01 冷冻泵    0   → 496.59（供冷起来了）
              合计 517.53 → 557.39 ⇒ ΔM = 7.7% ⇒ 判「目标调适」
        A004  U2A05 256.8 → 136.2（降 47.0%）
              U2A01   66  → 746
              合计 322.8 → 882.2 ⇒ ΔM = 173.3% ⇒ 判「正常」
      整栋楼是从供暖切到了供冷，两个反向变化在合计里相抵。只看真·采暖侧
      U2A05，两栋楼都远超 20% 阈值、都该判正常；B002 的触发完全来自
      冷侧顶上来填掉了热侧退下去的量。与六·C（U2A00 父子重复计入）同类，
      但那边只是把总量算大，这边会翻转判定。已挂问题清单。
      **口径厘清后要改的是 title 与 narrative 两处措辞，不涉及逻辑。**

   ⚠ medianCold / medianWarm 号称中位数，实际就是 totalDayA / totalDayB。
      coldDays 只有 1 天（1 天的中位数），warmDays 有 3 天但 payload 只带了
      其中 1 天的分项数据，medianWarm 无法核对。文案不写「中位数」二字。

   ⚠ reason 与 resultMd 的结论句是套死的模板，不随判定结果变：A004 的
      category = 正常，结论句仍写「ΔM=173.3%（<20% 触发）」，字面读作
      173.3% 小于 20%。第 ④ 块渲染 resultMd 原文会与结论卡打架，
      与六·E 的 BB-S1 同类（那次错的是表格标记，这次是结论句本身）。
      前端不复述 reason，结论卡走本常量。

   ⚠ U2A01 在 modelNodes 里叫「冷冻(采暖)泵」、在 resultMd 表格里叫
      「冷冻泵」。图例与表格用 energyBreakdown.series 的 name（即后者）。 */
const C08 = {
  narrative: {
    triggered:
      "{dayA}（{labelA}，室外日均干球 <b>{meteoA}{meteoUnit}</b>）与 {dayB}" +
      "（{labelB}，<b>{meteoB}{meteoUnit}</b>）温差 {meteoRise}{meteoUnit}。" +
      "两天的采暖泵日电耗合计为 <b>{totalA} kWh</b> 与 <b>{totalB} kWh</b>，" +
      "相对差 ΔM = <b>{deltaM}</b>，<b>落入触发区间</b>（< {thresholdAbs}）。" +
      "合计由 {nodeCount} 个节点相加，其中 {nodeList} —— 分项走向见下图。",
    normal:
      "{dayA}（{labelA}，室外日均干球 <b>{meteoA}{meteoUnit}</b>）与 {dayB}" +
      "（{labelB}，<b>{meteoB}{meteoUnit}</b>）温差 {meteoRise}{meteoUnit}。" +
      "两天的采暖泵日电耗合计为 <b>{totalA} kWh</b> 与 <b>{totalB} kWh</b>，" +
      "相对差 ΔM = <b>{deltaM}</b>，未落入触发区间（< {thresholdAbs}）。" +
      "合计由 {nodeCount} 个节点相加，其中 {nodeList} —— 分项走向见下图。",
  },
  /* 中性表述：不写「负荷跟随性不足」。合计口径把冷、热两侧相加，
     实测两侧方向相反，结论方向未澄清前只陈述落点。 */
  title: {
    triggered: "采暖泵电耗相对差落入触发区间",
    normal: "采暖泵电耗相对差未落入触发区间",
  },
  steps: [
    {
      kind: "test",
      what: "极寒日与温和日的温差",
      sub: "选窗前提：极寒日 T < {coldThreshold}{meteoUnit}、温和日 T > {warmThreshold}{meteoUnit}",
      val: "{meteoA}{meteoUnit} → {meteoB}{meteoUnit}",
      req: "两侧各自越过阈值",
      key: "meteo",
    },
    {
      kind: "stated",
      what: "取数据",
      sub: "{nodeCount} 个节点的日累计电耗相加，分项数值见下方图表与「数据」页签",
      val: "{labelA} {totalA} kWh · {labelB} {totalB} kWh",
      req: "—",
    },
    {
      kind: "test",
      what: "相对差 ΔM",
      sub: "|温和日 − 极寒日| ÷ 极寒日，取绝对值、恒为正",
      val: "{deltaM}",
      req: "< {thresholdAbs}",
      key: "dm",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 手册 C08「物理原理」原文 */
  causes: [
    "采暖侧缺乏气候补偿，循环泵定频定流量运行，不随室外温度调节输配量",
    "供暖季一次网/二次网阀门长期锁定，水力工况在整个采暖季不作切换",
    "极寒工况按设计满负荷整定后未再回调，温和日沿用同一套运行参数",
  ],
  readHint: {
    slope:
      "纵轴是日电耗的绝对值（kWh），不是比例——这条规则的分项里有整日为 0 的情形，" +
      "换算成百分比会失去意义。粗实线是判据看的合计，两条虚线是相加前的分项。" +
      "横轴下方标注两天的室外干球温度。留意两条虚线是否交叉：交叉意味着这两天之间" +
      "冷、热两侧发生了切换，合计的变化就不只反映采暖泵一侧。",
  },
};

/* C04（CR0024）。与 C06 同为 D 类 distribution，但**判据方向相反**：
   C06 比值大才触发（离散度过大），C04 是 CV 与比值都小才触发（毫无波动）。
   payload 的 metrics 字段名两条规则完全相同、且没有 algo 声明，
   解析器只能按 raw.ruleId 写死分流，已挂问题清单。

   ⚠ 实测两栋楼六个窗口的 powerSeries 全为常数（A005 恒 0.6 kW、
      A012 恒 0.1 kW），CV 与 std 都是精确的零。而 CV=0、R=1.0 对**任何**
      恒定读数都成立——真工频风机、待机功耗、坏掉的表三者不可区分。
      0.1 kW 更不可能是塔风机（常见 5.5–22 kW，同项目另一楼 U2A04 日耗
      262 kWh）。算法取的是「非零」时段，0.1 不是零所以进了序列。
      按约定照现状实现，文案如实写出样本数与恒定值，读者自行判断。

   ⚠ 「极值均值比」的标注依据是后端自己的声明（resultMd 写
      R_max_mean = P_max/μ、thresholdValue 写 max/mean<1.2）。常数序列下
      max/mean 与 max/min 都等于 1，无法由数据反证。前端只显示不重算。
   ✓/✕ 三条均为直接比较（无 passed 布尔，方向固定），指向触发。 */
const C04 = {
  narrative: {
    triggered:
      "{dateFrom}（湿球日极差 {meteoRange}{meteoUnit}）冷却塔风机非零运行时段共 {n} 个样本，" +
      "功率 <b>全部等于 {mean} kW</b>，标准差 {std}、变异系数 <b>{cv}</b>，" +
      "极值均值比 <b>{ratio}</b>。",
    normal:
      "{dateFrom}（湿球日极差 {meteoRange}{meteoUnit}）冷却塔风机非零运行时段共 {n} 个样本，" +
      "均值 {mean} kW、最大 {max} kW，变异系数 <b>{cv}</b>、极值均值比 <b>{ratio}</b>，" +
      "未同时低于 {cvThreshold} 与 {ratioThreshold} 的门槛。",
  },
  title: { triggered: "冷却塔风机功率全程无波动", normal: "冷却塔风机功率存在调节波动" },
  steps: [
    {
      kind: "test",
      what: "湿球日波动",
      sub: "选窗前提：代表日室外湿球温度的日内极差",
      val: "{meteoRange}{meteoUnit}",
      req: "≥ {meteoRangeThreshold}{meteoUnit}",
      key: "meteoRange",
    },
    {
      kind: "stated",
      what: "取数据",
      sub: "{dateFrom} 冷却塔（U2A04）非零运行时段的功率序列，{n} 个样本",
      val: "均值 {mean} kW · 最大 {max} kW · 标准差 {std}",
      req: "—",
    },
    {
      kind: "test",
      what: "变异系数 CV",
      sub: "标准差与均值之比，衡量整个序列的波动程度",
      val: "{cv}",
      req: "< {cvThreshold}",
      key: "cvLow",
    },
    {
      kind: "test",
      what: "极值均值比",
      sub: "最大功率与均值之比，衡量是否存在高档运行",
      val: "{ratio}",
      req: "< {ratioThreshold}",
      key: "rMaxMean",
    },
  ],
  foot: {
    triggered: "两条判据同时满足 → 判定为 <b>目标调适</b>",
    normal: "判据未同时满足 → 判定为 <b>正常</b>",
  },
  /* 手册 C04 原文 */
  causes: [
    "冷却塔风机未配置变频器，只能工频启停两档运行",
    "已配变频器但控制策略未启用，风机长期锁定在固定频率",
    "先核对冷却塔电表计量范围与量程——判据对恒定读数与无计量不可区分",
  ],
  readHint: {
    seq:
      "横轴是当日非零运行时段的样本序号。虚线标出全序列的功率水平——" +
      "湿球温度当天有明显日内波动，若风机随之调节，这条线应当起伏。",
    hist:
      "每根柱子是一个功率区间内的样本个数。柱子全部落在同一个区间，说明所有样本挤在一个功率值上。",
  },
};

/* BB-S1（CR0036）。⚠ **规则名与实际算法不是一回事**：
   ruleName 写「商场停业后主机泵下降极小」、thresholdValue 写
   「关店前后降幅<25%」，但 judgmentStandard / resultMd / metrics.algo
   全都是清晨预冷判定（Precool）。手册这一节标题是「停业后主机泵功耗下降
   极小**与过度提早预冷**判定」——两件事合成一条规则，而「数学算式与步骤」
   只写了预冷那半，停业后降幅那半从来没有算法。
   本模板按后端实际计算的（预冷）写。**页面头部的规则名来自接口，前端改不了，
   会显示成另一半**，已挂问题清单。

   ⚠ resultMd 第 2 行的 ✅/❌ 实测三窗口错了两个（mild=False 标 ✅、
      mild=True 标 ❌，且两个 False 窗口标法还不一致）。判决本身正确
      （early && mild）。第 ③ 块只取布尔，与第 ④ 块渲染的 resultMd 会打架。
   ⚠ T_start 是 15 分钟精度、hourlyProfiles 是逐时，图上只标到所在小时。
   ⚠ 温差阈值 3.0℃ 不在 payload 里，取自手册原文。 */
const BB_S1 = {
  narrative: {
    triggered:
      "{date}（{selectionReason}）冷源在 <b>{start}</b> 启动，早于 {startLimit}；" +
      "启动时室外干球温度 {tdb}℃，与商场室内设计基准 25℃ 相差 <b>{tempDiff}℃</b>。" +
      "当日逐时功率在 {dayMin} – {dayMax} kW 之间。",
    normal:
      "{date}（{selectionReason}）冷源在 <b>{start}</b> 启动（门槛 {startLimit}）；" +
      "启动时室外干球温度 {tdb}℃，与商场室内设计基准 25℃ 相差 <b>{tempDiff}℃</b>。" +
      "启动过早与温差偏小两项未同时成立。",
  },
  title: { triggered: "冷源预冷启动过度超前", normal: "冷源启动时刻未构成过度预冷" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "典型营业日 {date} 清晨过渡段 05:00–10:00 的功率谱线，以一阶差分 ΔP ≥ 0.20 × P_max 识别冷源启动时刻",
      val: "T_start {start} · 当日最大 {dayMax} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "启动时间",
      sub: "冷源实际启动时刻，早于门槛即提前量超过 2.5 小时",
      val: "{start}",
      req: "< {startLimit}",
      key: "early",
    },
    {
      kind: "test",
      what: "室内外温差",
      sub: "启动时室外干球与商场室内设计基准 25℃ 之差，偏小说明清晨气象负荷极弱",
      val: "{tempDiff}℃",
      req: "≤ 3.0℃",
      key: "mild",
    },
  ],
  foot: {
    triggered: "两条判据同时满足 → 判定为 <b>目标调适</b>",
    normal: "判据未同时满足 → 判定为 <b>正常</b>",
  },
  /* 手册 BB-S1「重构方案与物理原理」+「关键参数工程学依据」原文 */
  causes: [
    "清晨气象负荷极弱时盲目提早 3~4 小时开启大功率冷源满载空跑",
    "预冷启动提前量未与室外干球温度动态耦合，按固定时间表启动",
    "商场大空间新风机组设计功率通常几十到上百千瓦，合理预冷提前量约 2 小时；超过 2.5 小时属控制策略过度冗余",
  ],
  readHint: {
    day:
      "浅色底纹是算法的诊断窗口（清晨 05:00–10:00），深色的一小时是冷源启动所在的小时。" +
      "启动时刻由 15 分钟数据识别、精确到刻，本图为逐时曲线，故只标到小时。",
  },
};

/* AA-S3（CR0033）。⚠ 与 AA-S2 / BA-S2 同属**手册两版都没有正文**的五条之一
   （v4 标「v2 原文保留」，而 v2.1 的 S 系章节从头到尾只有表格）。
   causes 无原文可抄，只列后端 judgmentStandard 那句判定口径，
   等规则负责人补正文后替换即可，纯增量。

   取数时段由逐时数据反推确定，三窗口精确吻合：
     P_am = mean(09:00–11:00)   P_l = mean(12:00–14:00)
   ⚠ 判据 **单边**：drop = (P_am − P_l)/P_am < 15% 触发，drop 为负
     （午休功率反高于上午）同样满足。模板不支持条件分支，方向措辞在
     RuleDetailAreaV2 的 vals 里算好成 {dropDesc} 再塞进句子——
     直接写「降幅 -69.9%」会被读成「降了负数」。
   ⚠ drop 取后端值不前端复算：后端是拿已四舍五入到两位小数的 P_am/P_l
     相除（W1 复算 0.0323 vs 后端 0.0325）。
   数据源 U2B01+U2B02 是 U2B00 下的兄弟节点，相加不重复计入。
   ✓/✕ 直接比阈值（无 passed 布尔，方向固定），指向触发。 */
const AA_S3 = {
  narrative: {
    triggered:
      "{date}（{selectionReason}）上午 09:00–11:00 全空气机组与新风机组的平均功率为 " +
      "<b>{pam} kW</b>，午休 12:00–14:00 为 <b>{pl} kW</b>，<b>{dropDesc}</b>。" +
      "当日逐时功率在 {dayMin} – {dayMax} kW 之间。",
    normal:
      "{date}（{selectionReason}）上午 09:00–11:00 全空气机组与新风机组的平均功率为 " +
      "<b>{pam} kW</b>，午休 12:00–14:00 为 <b>{pl} kW</b>，<b>{dropDesc}</b>，" +
      "已达到 {threshold} 的降载门槛。",
  },
  title: { triggered: "午休时段风机未降载", normal: "午休时段风机已降载" },
  steps: [
    {
      kind: "stated",
      what: "取数据",
      sub: "典型工作日 {date} 上午 09:00–11:00 与午休 12:00–14:00 两个时段的风机平均功率",
      val: "上午 {pam} kW · 午休 {pl} kW",
      req: "—",
    },
    {
      kind: "test",
      what: "午休降幅",
      sub: "午休时段平均功率相对上午的下降比例，为负表示午休反而更高",
      val: "{drop}",
      req: "< {threshold}",
      key: "lunchDrop",
    },
  ],
  foot: {
    triggered: "判据满足 → 判定为 <b>目标调适</b>",
    normal: "判据未满足 → 判定为 <b>正常</b>",
  },
  /* 唯一一条，出处是后端 judgmentStandard，不是手册。其余留空走组件兜底。 */
  causes: ["午休时段风机管控失效（后端判定口径，手册暂无该规则正文）"],
  readHint: {
    day:
      "两片底纹是算法的两个取数时段（上午 09:00–11:00、午休 12:00–14:00），" +
      "两条虚线是各自时段的平均功率，判据就是后者相对前者的下降比例。",
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
  C03,
  CR0021: C03,
  "AA-S2": AA_S2,
  CR0032: AA_S2,
  "BA-S2": BA_S2,
  CR0035: BA_S2,
  "AA-S1": AA_S1,
  CR0031: AA_S1,
  C02,
  CR0019: C02,
  C06,
  CR0025: C06,
  C07,
  CR0027: C07,
  C04,
  CR0024: C04,
  "BB-S1": BB_S1,
  CR0036: BB_S1,
  "AA-S3": AA_S3,
  CR0033: AA_S3,
  C08,
  CR0028: C08,
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
