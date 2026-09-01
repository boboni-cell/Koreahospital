import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import db from "@/lib/db";

interface ResearchInput {
  niche?: string;
  platform?: string;
  goal?: string;
}

const SOURCES = ["小红书", "抖音", "微博", "知乎", "B站", "公众号"];

/** 本地情报兜底：从 DB 读已有选题/内容作参考 */
function localTrends(niche: string, platform: string): string[] {
  try {
    const topics = db
      .prepare("SELECT title, description FROM topics LIMIT 5")
      .all() as { title: string; description: string | null }[];
    const contents = db
      .prepare("SELECT title FROM contents WHERE platform=? LIMIT 5")
      .all(platform) as { title: string }[];
    const t = topics.map((x) => `选题池：${x.title}${x.description ? "｜" + x.description : ""}`);
    const c = contents.map((x) => `已有内容：${x.title}`);
    return [...t, ...c].slice(0, 8);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const pre = requireAgentPreconditions("researcher");
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  const input: ResearchInput = await req.json();

  // Q2=a：agent 混合选择并注入本次需要的 skill（如起号方法论 / 合规红线）
  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("选题研究", input as Record<string, unknown>);
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  // 由 researcher Agent 模型基于自身知识 + skill + 本地情报产出选题灵感
  const local = localTrends(input.niche || "毛发移植", input.platform || "xiaohongshu");

  try {
    const sys = [
      "你是矩阵运营选题研究员，参考多平台信源 + 你掌握的近期平台内容趋势做选题发现与热度评估。",
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
      "以下是本账本地已有的选题/内容（供对齐语境，避免重复）：",
      ...local,
      "",
      '输出 JSON：{"sources":["信源1"],"topics":[{"title":"选题","heat":8,"angle":"切入点","why":"推荐理由","contentType":"image"}],"note":"合规提示"}',
      "其中 contentType 用 \"image\"（适合图文）或 \"video\"（适合视频/口播），每个选题都要给。",
    ].join("\n");
    const text = await chatCompleteForAgent(
      "researcher",
      [
        { role: "system", content: sys.join("\n") },
        { role: "user", content: user },
      ],
      { maxTokens: 3000, timeoutMs: 110000 }
    );
    const data = parseJsonBlock<{
      sources: string[];
      topics: { title: string; heat: number; angle: string; why: string; contentType?: "image" | "video" }[];
      note: string;
    }>(text);
    return NextResponse.json({ ...data, modelPowered: true, engine: "researcher-agent" });
  } catch (e) {
    console.error("AI research failed:", e);
    return NextResponse.json(templateResearch(input));
  }
}

function templateResearch(input: ResearchInput) {
  return {
    sources: SOURCES,
    topics: [
      { title: `[模板] ${input.niche || "毛发移植"} 高频疑问盘点`, heat: 8, angle: "科普合集", why: "未接入模型，模板选题", contentType: "image" },
      { title: `[模板] 术后第 ${input.platform === "douyin" ? "180" : "90"} 天真实记录`, heat: 7, angle: "案例日记", why: "模板选题", contentType: "video" },
      { title: `[模板] 费用到底怎么算`, heat: 9, angle: "顾问答疑", why: "模板选题", contentType: "image" },
    ],
    note: "未接入模型，展示模板选题。在「系统设置」配置你的模型 Key 后可生成真实选题。",
    modelPowered: false,
  };
}
