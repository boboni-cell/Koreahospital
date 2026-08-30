import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete, parseJsonBlock } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";

interface ResearchInput {
  niche?: string;
  platform?: string;
  goal?: string;
}

const SOURCES = ["小红书", "抖音", "微博", "知乎", "B站", "公众号"];

export async function POST(req: NextRequest) {
  const input: ResearchInput = await req.json();
  const cfg = (await getActiveTextConfig()) ?? (await readAiConfig());

  // Q2=a：agent 混合选择并注入本次需要的 skill（如起号方法论 / 合规红线）
  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("选题研究", input as Record<string, unknown>);
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  if (!cfg.enabled) {
    return NextResponse.json(templateResearch(input));
  }
  try {
    const sys = [
      "你是矩阵运营选题研究员，参考多平台信源做选题发现与热度评估。",
      "遵守平台规则与医疗合规，不夸大、不承诺。只输出一个 JSON 对象，不要解释、不要 markdown 围栏。",
    ];
    if (skillContent) {
      const extra = skillContent
        .split(/^#\s*/m)
        .map((s) => s.trim())
        .filter((s) => s.length > 40)
        .slice(0, 4);
      if (extra.length) sys.push("以下是须遵守的补充规范（来自内部 skill）：", ...extra);
    }
    const user = [
      `方向：${input.niche || "毛发移植"}`,
      `目标平台：${input.platform || "小红书"}`,
      `运营目标：${input.goal || "涨粉"}`,
      `参考信源：${SOURCES.join("、")}`,
      "",
      '输出 JSON：{"sources":["信源1"],"topics":[{"title":"选题","heat":8,"angle":"切入点","why":"推荐理由"}],"note":"合规提示"}',
    ].join("\n");
    const text = await chatComplete(
      [
        { role: "system", content: sys.join("\n") },
        { role: "user", content: user },
      ],
      cfg,
      { maxTokens: 3000, timeoutMs: 110000 }
    );
    const data = parseJsonBlock<{
      sources: string[];
      topics: { title: string; heat: number; angle: string; why: string }[];
      note: string;
    }>(text);
    return NextResponse.json({ ...data, modelPowered: true });
  } catch (e) {
    console.error("AI research failed:", e);
    return NextResponse.json(templateResearch(input));
  }
}

function templateResearch(input: ResearchInput) {
  return {
    sources: SOURCES,
    topics: [
      { title: `[模板] ${input.niche || "毛发移植"} 高频疑问盘点`, heat: 8, angle: "科普合集", why: "未接入模型，模板选题" },
      { title: `[模板] 术后第 ${input.platform === "douyin" ? "180" : "90"} 天真实记录`, heat: 7, angle: "案例日记", why: "模板选题" },
      { title: `[模板] 费用到底怎么算`, heat: 9, angle: "顾问答疑", why: "模板选题" },
    ],
    note: "未接入模型，展示模板选题。在「系统设置」配置你的模型 Key 后可生成真实选题。",
    modelPowered: false,
  };
}
