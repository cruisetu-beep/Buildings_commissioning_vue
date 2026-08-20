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
