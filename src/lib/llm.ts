import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

export const llmMode: "real" | "mock" = KEY ? "real" : "mock";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: KEY });
  return client;
}

/** 通用：调 Claude 拿 JSON 输出（失败抛错由调用方决定回退） */
async function callClaudeJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const c = getClient();
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr) as T;
}

// ============== 1. 经营摘要 ==============
export type BriefingInput = {
  curGmv: number;
  prevGmv: number;
  curOrders: number;
  prevOrders: number;
  curUv: number;
  prevUv: number;
  topCategoryGmv?: { category: string; gmv: number }[];
  anomalies?: string[];
  competitorMovements?: string[];
};

export type Briefing = {
  headline: string;
  paragraphs: string[]; // 3 段总结
  todos: { title: string; reason: string; priority: "high" | "medium" | "low" }[];
};

export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  if (llmMode === "real") {
    try {
      return await callClaudeJSON<Briefing>(
        "你是一名近场零售经营分析师。基于输入数据，给出 1 句新闻标题式 headline、3 段总结（业绩 / 异常 / 竞对），以及 5 条今日待办（每条含 reason 和 priority）。输出 JSON。",
        JSON.stringify(input, null, 2)
      );
    } catch (e) {
      console.warn("[llm] generateBriefing 调用失败回退 mock:", (e as Error).message);
    }
  }
  return mockBriefing(input);
}

function mockBriefing(input: BriefingInput): Briefing {
  const gmvDelta = ((input.curGmv - input.prevGmv) / input.prevGmv) * 100;
  const orderDelta = ((input.curOrders - input.prevOrders) / input.prevOrders) * 100;
  const uvDelta = ((input.curUv - input.prevUv) / input.prevUv) * 100;
  const wan = (n: number) => `${(n / 10000).toFixed(1)} 万`;
  const sign = (n: number) => (n > 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);
  const dir = gmvDelta > 0 ? "增长" : "下降";

  const topCat = input.topCategoryGmv?.[0]?.category || "饮料";
  const competitorMove = input.competitorMovements?.[0] || "松鼠便利近 3 天有 8 个 SKU 调价";

  return {
    headline: `近 7 天 GMV ${wan(input.curGmv)} 元，环比 ${sign(gmvDelta)}，${dir}主要来自${topCat}品类拉动`,
    paragraphs: [
      `**业绩**：近 7 天合并 GMV ${wan(input.curGmv)} 元 (上周 ${wan(input.prevGmv)} 元)，订单 ${input.curOrders.toLocaleString()} 单 (${sign(orderDelta)})，访客 ${input.curUv.toLocaleString()} 人 (${sign(uvDelta)})。客单价稳定在 ${(input.curGmv / input.curOrders).toFixed(1)} 元区间。`,
      `**异常**：${input.anomalies?.[0] || `周六单日 GMV 偏离均值 +18%，建议复盘当日营销动作并固化为周末标准动作`}。${input.anomalies?.[1] || "退款率维持在 1.5% 以下，履约时长 28 分钟内，运营稳态。"}`,
      `**竞对**：${competitorMove}，其中酒类、烘焙、进口零食三个品类松鼠覆盖度显著高于我方，建议优先评估补货机会（详见货盘补货页）。`,
    ],
    todos: [
      { title: "评估「酒类」品类是否上架（首批 5 SKU）", reason: "竞对已全覆盖 + 该品类对夜间订单 GMV 拉动验证有效", priority: "high" },
      { title: "把「饮料-碳酸」价格带 5-10 元区间的 3 个长尾 SKU 跟价松鼠", reason: "价差 >8%，预计影响转化", priority: "high" },
      { title: "复盘上周六大单（>200 元）的来源结构", reason: "周六 GMV +18% 异常需归因", priority: "medium" },
      { title: "下周「618 神券节」选品 + 报名", reason: "报名截止剩 3 天，缺席机会成本约 1.2 万 GMV", priority: "high" },
      { title: "推送本日运营摘要到企微管理群", reason: "管理同步", priority: "low" },
    ],
  };
}

// ============== 2. 补货建议 ==============
export type GapSpu = {
  spuId: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  spec: string;
  competitorPrice: number;
  competitorMonthlySales?: number;
  competitorName: string;
};

export type RestockSuggestion = {
  spuId: string;
  category: string;
  suggestedName: string;
  suggestedBrand: string;
  suggestedSpec: string;
  suggestedCostMin: number;
  suggestedCostMax: number;
  suggestedPrice: number;
  expectedMonthlySales: number;
  expectedGmvLift: number;
  reasons: string[];
  confidence: "high" | "medium" | "low";
};

export async function generateRestock(gaps: GapSpu[], topN = 10): Promise<RestockSuggestion[]> {
  if (llmMode === "real") {
    try {
      return await callClaudeJSON<RestockSuggestion[]>(
        "你是近场零售采购负责人。基于缺口 SKU 数据，输出 Top N 补货建议（按预估 GMV 增量排序），每条包含进货价区间、建议售价、预估月销、Top3 理由（具体可执行）、置信度。输出 JSON 数组。",
        JSON.stringify({ gaps, topN }, null, 2)
      );
    } catch (e) {
      console.warn("[llm] generateRestock 调用失败回退 mock:", (e as Error).message);
    }
  }
  return mockRestock(gaps, topN);
}

function mockRestock(gaps: GapSpu[], topN: number): RestockSuggestion[] {
  // 按 competitorMonthlySales 排序拿 top N
  const sorted = [...gaps]
    .sort((a, b) => (b.competitorMonthlySales || 0) - (a.competitorMonthlySales || 0))
    .slice(0, topN);

  return sorted.map((g) => {
    const costMin = +(g.competitorPrice * 0.55).toFixed(2);
    const costMax = +(g.competitorPrice * 0.68).toFixed(2);
    const suggestedPrice = +(g.competitorPrice * 0.97).toFixed(2); // 比竞品略低
    const expectedMonthlySales = Math.floor((g.competitorMonthlySales || 200) * 0.4); // 后来者 40% 假设
    const expectedGmvLift = +(expectedMonthlySales * suggestedPrice).toFixed(0);
    const isHighDemand = (g.competitorMonthlySales || 0) > 1500;
    const isHighPrice = g.competitorPrice > 30;
    const reasons = [
      `竞对${g.competitorName}月销 ${g.competitorMonthlySales || "—"} 件，是该价格带 Top3 单品`,
      isHighPrice
        ? `${g.category}-${g.subcategory} 高客单价品类，单 SKU 贡献毛利预估 ${((suggestedPrice - costMax) * expectedMonthlySales).toFixed(0)} 元/月`
        : `${g.category}-${g.subcategory} 高频复购品，能带动连带销售`,
      `建议进货价 ¥${costMin}-${costMax}，售价 ¥${suggestedPrice}（比竞对低 ${(((g.competitorPrice - suggestedPrice) / g.competitorPrice) * 100).toFixed(0)}%）锁价格优势`,
    ];
    return {
      spuId: g.spuId,
      category: g.category,
      suggestedName: g.name,
      suggestedBrand: g.brand,
      suggestedSpec: g.spec,
      suggestedCostMin: costMin,
      suggestedCostMax: costMax,
      suggestedPrice,
      expectedMonthlySales,
      expectedGmvLift,
      reasons,
      confidence: isHighDemand ? "high" : isHighPrice ? "medium" : "low",
    };
  });
}

// ============== 3. 活动打分 ==============
export type CampaignScoreInput = {
  id: string;
  platform: string;
  type: string;
  name: string;
  discountType: string;
  discountValue: number;
  budgetLimit?: number | null;
  daysToSignup: number;
};

export type CampaignVerdict = {
  id: string;
  score: number; // 0-100
  action: "报名" | "缓报" | "不报";
  reason: string;
};

export async function scoreCampaign(input: CampaignScoreInput): Promise<CampaignVerdict> {
  if (llmMode === "real") {
    try {
      return await callClaudeJSON<CampaignVerdict>(
        "你是商家运营经理。给定一个平台活动，输出 0-100 打分、报名/缓报/不报 决策、一句理由。输出 JSON。",
        JSON.stringify(input, null, 2)
      );
    } catch (e) {
      console.warn("[llm] scoreCampaign 调用失败回退 mock:", (e as Error).message);
    }
  }
  return mockScoreCampaign(input);
}

function mockScoreCampaign(input: CampaignScoreInput): CampaignVerdict {
  // 平台权重
  const platformWeight: Record<string, number> = { meituan: 1.0, eleme: 0.85, douyin: 0.75, jd: 0.7 };
  // 活动类型权重（神券节/夜宵节 > 折扣 > 包邮）
  const typeWeight: Record<string, number> = {
    "神券节": 1.2, "夜宵节": 1.1, "团购节": 1.05, "品类日": 1.0, "特价团": 1.0,
    "限时折扣": 0.9, "PLUS日": 0.85, "新人券": 0.85, "团购券": 0.85, "京东到家": 0.75,
    "直播专享": 0.8, "品牌日": 1.0,
  };
  // 折扣力度（discount 越大越好，但太大利润压不住）
  let discountScore = 50;
  if (input.discountType === "满减") discountScore = Math.min(input.discountValue * 1.5, 90);
  else if (input.discountType === "折扣") discountScore = (1 - input.discountValue) * 200; // 0.7 折 = 60 分
  else if (input.discountType === "团购") discountScore = (1 - input.discountValue) * 180;
  else discountScore = 55;

  const platformS = (platformWeight[input.platform] || 0.7) * 30;
  const typeS = (typeWeight[input.type] || 1.0) * 25;
  const discS = (discountScore / 100) * 35;
  const urgencyS = input.daysToSignup <= 1 ? 10 : input.daysToSignup <= 3 ? 7 : 4;

  const score = Math.min(100, Math.round(platformS + typeS + discS + urgencyS));
  const action: CampaignVerdict["action"] = score >= 75 ? "报名" : score >= 55 ? "缓报" : "不报";

  let reason = "";
  if (action === "报名") {
    reason = `${input.platform === "meituan" ? "美团主战场" : "次级平台"} ${input.type}，折扣力度可控、预期 ROI 1.8 以上，建议立即报名${input.daysToSignup <= 2 ? "（截止 ≤2 天，紧急）" : ""}。`;
  } else if (action === "缓报") {
    reason = `${input.type} 折扣力度偏弱（${input.discountType} ${input.discountValue}），建议等 1-2 天看竞对动向再定。`;
  } else {
    reason = `${input.platform} 流量占比 <15% 且 ${input.type} 历史 ROI 不达预期，本次建议跳过、把预算挪给主平台高价值活动。`;
  }
  return { id: input.id, score, action, reason };
}

// ============== 4. 跟价建议 ==============
export type PricingInput = {
  spuId: string;
  name: string;
  myPrice: number;
  competitorMinPrice: number;
  competitorAvgPrice: number;
};

export type PricingVerdict = {
  spuId: string;
  action: "跟价" | "守住" | "差异化";
  suggestedPrice?: number;
  reason: string;
};

export async function recommendPricing(input: PricingInput): Promise<PricingVerdict> {
  if (llmMode === "real") {
    try {
      return await callClaudeJSON<PricingVerdict>(
        "你是商家价盘经理。给定我方价 + 竞品最低价 + 平均价，输出 跟价/守住/差异化 决策、建议价、一句理由。输出 JSON。",
        JSON.stringify(input, null, 2)
      );
    } catch (e) {
      console.warn("[llm] recommendPricing 调用失败回退 mock:", (e as Error).message);
    }
  }
  return mockPricing(input);
}

function mockPricing(input: PricingInput): PricingVerdict {
  const diffMin = ((input.myPrice - input.competitorMinPrice) / input.competitorMinPrice) * 100;
  if (diffMin > 12) {
    return {
      spuId: input.spuId,
      action: "跟价",
      suggestedPrice: +(input.competitorMinPrice * 0.99).toFixed(2),
      reason: `我方比竞对最低价高 ${diffMin.toFixed(0)}%，转化已受影响，建议跟到比竞对最低价低 1%。`,
    };
  }
  if (diffMin < -10) {
    return {
      spuId: input.spuId,
      action: "守住",
      reason: `我方已比竞对最低价低 ${Math.abs(diffMin).toFixed(0)}%，无需再降。看 7 天后是否有竞品降价反扑再调整。`,
    };
  }
  if (diffMin > 5) {
    return {
      spuId: input.spuId,
      action: "差异化",
      reason: `价差 ${diffMin.toFixed(0)}% 内，建议捆绑销售或赠品锁定客单价，避免直接跟价压毛利。`,
    };
  }
  return {
    spuId: input.spuId,
    action: "守住",
    reason: `价差在 ±5% 内，处于合理区间，无需调价。`,
  };
}
