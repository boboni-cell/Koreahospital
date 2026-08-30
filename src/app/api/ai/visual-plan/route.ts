import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete, parseJsonBlock } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";

/**
 * 内容 → 配图方案（feature 4）：agent 判断「该用真实拍摄照片 还是 AI 生成」，
 * 并调用 skill（如 gbro-cover-design）产出可直接出图的提示词 + 推荐素材类别。
 * 只做判断与提示词，不生成图；生成走 /api/assets/generate。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const content = body.content || {};
  const title = content.title || "";
  const cbody = content.body || "";
  const role = content.role || "";
  const platform = content.platform || "xiaohongshu";

  const cfg = (await getActiveTextConfig()) ?? (await readAiConfig());
  if (!cfg.enabled) {
    return NextResponse.json({
      prompt: "",
      shouldUseReal: true,
      reason: "未接入模型，默认建议使用真实拍摄照片（医疗类更稳妥）",
      category: "科普图示",
      modelPowered: false,
    });
  }

  // agent 选 skill：视觉/封面类
  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("封面与配图", content);
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  try {
    const sys = [
      "你是医疗新媒体视觉总监。根据一篇笔记内容，判断这篇更适合『真实拍摄照片』还是『AI 生成配图』，并产出可跑图的提示词。",
      "医疗/植发类：涉及真实患者、术前术后对比、手术环境、效果验证的，强烈建议真实拍摄照片（涉及隐私需授权）。",
      "AI 生成适合：科普示意、流程/结构图、氛围背景、无真实人物出镜的抽象配图。",
      "只输出一个 JSON 对象，不要解释、不要 markdown 围栏。",
    ];
    const user = [
      `标题：${title}`,
      `正文：${cbody.slice(0, 800)}`,
      `账号角色：${role}`,
      `平台：${platform}`,
      "",
      "输出 JSON：",
      '{"shouldUseReal":true/false,"reason":"一句话理由","prompt":"若AI生成，放可直接跑图的提示词(3:4竖版/风格/主体/构图/文字)；若用真实照片则留空","category":"建议素材类别"}',
    ].join("\n");
    const text = await chatComplete(
      [
        { role: "system", content: sys + (skillContent ? `\n\n参考 skill：\n${skillContent.slice(0, 3000)}` : "") },
        { role: "user", content: user },
      ],
      cfg,
      { maxTokens: 1200, timeoutMs: 60000 }
    );
    const d = parseJsonBlock<{
      shouldUseReal: boolean;
      reason: string;
      prompt: string;
      category: string;
    }>(text);
    return NextResponse.json({
      shouldUseReal: !!d.shouldUseReal,
      reason: d.reason || "",
      prompt: d.prompt || "",
      category: d.category || "科普图示",
      modelPowered: true,
    });
  } catch (e) {
    console.error("visual-plan failed:", e);
    return NextResponse.json(
      { prompt: "", shouldUseReal: true, reason: "AI 判断失败，建议用真实照片。", category: "科普图示", modelPowered: false },
      { status: 200 }
    );
  }
}
