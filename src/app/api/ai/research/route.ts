import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete, parseJsonBlock } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";
import db from "@/lib/db";

interface ResearchInput {
  niche?: string;
  platform?: string;
  goal?: string;
}

const SOURCES = ["小红书", "抖音", "微博", "知乎", "B站", "公众号"];

/** 无 key 网页搜索：DuckDuckGo HTML 端点，取标题+摘要 */
async function searchWeb(q: string, limit = 6): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "zh-CN,zh;q=0.9" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // 每块 result__a（标题）+ result__snippet（摘要）
    const blocks = html.split('class="result results_links');
    const out: string[] = [];
    for (const b of blocks.slice(1)) {
      const t = b.match(/result__a[^>]*>([\s\S]*?)<\/a>/)?.[1];
      const s = b.match(/result__snippet[^>]*>([\s\S]*?)<\/a>/)?.[1];
      const tt = t?.replace(/<[^>]+>/g, "").trim();
      const ss = s?.replace(/<[^>]+>/g, "").trim();
      if (tt) out.push(ss ? `${tt} — ${ss.slice(0, 90)}` : tt);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

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

  // 上网搜索给灵感（无 key，取不到就回退本地）
  const q = `${input.platform || "小红书"} ${input.niche || "毛发移植"} 爆款 选题 热门`;
  const webHits = await searchWeb(q);
  const local = localTrends(input.niche || "毛发移植", input.platform || "xiaohongshu");
  const inspiration = webHits.length ? webHits : local;

  if (!cfg.enabled) {
    return NextResponse.json(templateResearch(input));
  }
  try {
    const sys = [
      "你是矩阵运营选题研究员，参考多平台信源 + 网络实时情报做选题发现与热度评估。",
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
      "以下是从网络/本地检索到的高热度相关标题，供你提炼选题灵感（可能含噪声，仅作参考）：",
      ...inspiration,
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
    return NextResponse.json({ ...data, modelPowered: true, webHits: webHits.length });
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
