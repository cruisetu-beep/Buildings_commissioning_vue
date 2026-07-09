const THRESHOLD_MAP = {
  "D01": {
    unit: "R² ≥",
    values: {
      AA:"0.50", BA:"0.50", BB:"0.45", BC:"0.35", BD:"0.45",
      BE:"0.35", BF:"0.40", BH:"0.45", BI:"0.40", BJ:"0.40", BZ:"0.50"
    },
    notes: { BC:"24h连续", BE:"24h连续" }
  },
  "D02": {
    unit: "降幅 ≥",
    values: {
      AA:"10%", BA:"10%", BB:"10%", BC:"7%", BD:"8%",
      BE:"7%", BF:"9%", BH:"8%", BI:"9%", BJ:"9%", BZ:"10%"
    },
    notes: {}
  },
  "D03": {
    unit: "夜/日 ≤",
    values: {
      AA:"60%", BA:"65%", BB:"70%", BC:"85%", BD:"70%",
      BE:"88%", BF:"75%", BH:"65%", BI:"70%", BJ:"80%", BZ:"70%"
    },
    notes: { BC:"高", BE:"高" }
  },
  "D04": {
    unit: "过渡/盛夏 ≤",
    values: {
      AA:"50%", BA:"55%", BB:"80%", BC:"75%", BD:"60%",
      BE:"80%", BF:"70%", BH:"60%", BI:"65%", BJ:"70%", BZ:"60%"
    },
    notes: { BB:"客流高", BE:"高" }
  },
  "D05": {
    unit: "分组策略",
    values: {
      AA:"间歇", BA:"间歇", BB:"客流上涨", BC:"24h连续", BD:"活动",
      BE:"24h连续", BF:"客流上涨", BH:"寒暑假", BI:"活动", BJ:"24h连续", BZ:"间歇"
    },
    notes: {}
  }
};
export { THRESHOLD_MAP };
