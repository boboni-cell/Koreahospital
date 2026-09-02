import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai-client";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { injectSkillsForTask } from "@/lib/skills";

/**
 * 配图/视频计划：生成文案时同步给出「这条内容适合配什么」。
 * - shouldUseReal: 该用真实拍摄照片/视频，还是 AI 生成
 * - mediaType: image | video
 * - desc: 什么样的图 / 什么样的视频（画面、氛围、构图）
 * - storyboard: 若是视频，给剪辑分镜表
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const content = body.content || {};
  const platform = content.platform || "xiaohongshu";

  const pre = requireAgentPreconditions("writer");
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  let skillContent = "";
  try {
    skillContent = await injectSkillsForTask(
      "为内容生成配图/视频方案",
      { platform, role: content.role, kind: /视频|口播|vlog/.test(`${content.title ?? ""} ${content.body ?? ""}`) ? "video" : "image" },
      ["medical-compliance"]
    );
  } catch (e) {
    console.warn("[media-plan] skill 注入跳过", e);
  }

  try {
    const sys = [
      "你是内容配图/视频指导。根据一篇内容，判断它该配什么样的视觉素材，并给出具体可执行建议。",
      "对医疗植发内容：凡涉及真实患者案例、疗效对比、医生出镜，倾向「真实拍摄」；科普/概念/氛围类可「AI 生成」。",
      "只输出一个 JSON 对象，不要解释、不要 markdown 围栏。",
      skillContent ? `\n\n[专业指引 skill]\n${skillContent.slice(0, 3000)}` : "",
    ].filter(Boolean);
    const user = [
      `标题：${content.title || ""}`,
      `正文：${content.body?.slice(0, 600) || ""}`,
      `平台：${platform}`,
      `角色：${content.role || ""}`,
      "",
      `输出 JSON 形如：
{
  "mediaType": "image",
  "shouldUseReal": true,
  "desc": "真实术后 180 天患者局部特写，自然柔光，面部打码保护隐私",
  "storyboard": null
}`,
      "当 mediaType 为 video 时，storyboard 给一个 3-6 镜头的分镜数组：[{no, duration, shot, scene, voiceover}]",
    ].join("\n");
    const text = await chatCompleteForAgent(
      "writer",
      [{ role: "system", content: sys.join("\n") }, { role: "user", content: user }],
      { maxTokens: 800, timeoutMs: 60000 }
    );
    const d = parseJsonBlock<{ mediaType: "image" | "video"; shouldUseReal: boolean; desc: string; storyboard: { no: number; duration: string; shot: string; scene: string; voiceover: string }[] | null }>(text);
    return NextResponse.json({ ...d, modelPowered: true });
  } catch (e) {
    console.error("media-plan failed:", e);
    return NextResponse.json({ ...fallback(content), modelPowered: false });
  }
}

function fallback(content: any) {
  const mediaType = /视频|口播|vlog|广告|实拍/.test(`${content.title ?? ""} ${content.body ?? ""}`) ? "video" : "image";
  return {
    mediaType,
    shouldUseReal: true,
    desc: mediaType === "video"
      ? "该内容适合院长/患者实拍口播视频，真实感强、易建立信任；场景建议医院环境+自然光。分镜见「生成视频脚本」。"
      : "该内容建议配真实案例/场景照片（面部分辨或打码），避免 AI 假图降低可信度。",
    storyboard: null,
  };
}
