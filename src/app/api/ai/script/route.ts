import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";
import { VIDEO_SCRIPT_TYPES } from "@/lib/constants";

const TYPE_HINT: Record<string, string> = {
  ad: "品牌广告片：讲究画面质感、品牌调性、节奏感，适合投放",
  doctor: "院长出镜实拍：院长亲自出镜讲专业，建立权威信任，口播为主+实拍空镜",
  daily: "医院日常：真实的院内场景、医护工作花絮、环境细节，松弛有生活感",
  vlog: "患者康复 vlog：以患者第一视角记录恢复过程，真实感、时间线叙事",
  tvc: "TVC 宣传片：大片质感、镜头语言丰富、情绪渲染强",
  education: "知识科普口播：讲清一个脱发/植发知识点，条理清晰、有记忆点",
};

/**
 * 选题 → AI 视频脚本（按类型）：广告/院长实拍/医院日常/vlog/TVC/科普口播。
 * agent 调 video-storyboard skill，产出可拍摄的分镜脚本。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const topic = body.topic || {};
  const title = topic.title || "";
  const description = topic.description || "";
  const role = topic.role || "viral";
  const platform = topic.platform || "douyin";
  const type = topic.type || "doctor"; // 视频脚本类型

  const cfg = (await getActiveTextConfig()) ?? (await readAiConfig());
  if (!cfg.enabled) {
    return NextResponse.json({ script: "", modelPowered: false, note: "未接入模型，无法生成脚本。" });
  }

  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("生成视频脚本", topic);
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  const typeName = VIDEO_SCRIPT_TYPES.find((t) => t.id === type)?.name ?? "短视频";

  try {
    const sys = [
      "你是短视频导演。根据一个选题和类型，产出一份可直接拿去拍摄的完整视频脚本。",
      "按给定类型定调（广告/院长出镜/医院日常/vlog/TVC/科普口播），节奏、情绪、镜头语言随之不同。",
      "必须是「能照着拍」的：分镜（镜头号/景别/画面/运镜/时长）+ 口播词 + B-roll + 拍摄注意事项。",
      "纯文本输出，markdown 分节，不要 JSON。",
    ];
    const user = [
      `选题：${title}`,
      `说明：${description || "（无）"}`,
      `账号角色：${role}`,
      `平台：${platform}`,
      `脚本类型：${typeName} —— ${TYPE_HINT[type] ?? ""}`,
      "",
      "按以下结构输出：",
      "1. 一句话核心创意思路（点明类型定位）",
      "2. 分镜表（镜头号｜景别｜画面｜运镜｜时长｜口播/字幕）——务必逐镜给出，镜头数按类型合理（广告/TVC 可更精炼，vlog/日常可按时间线多镜）",
      "3. 开场钩子（前3秒，按类型设计：广告高概念/院长权威开场/日常松弛切入/vlog 情绪代入）",
      "4. B-roll 镜头清单（空镜、细节、环境）",
      "5. 结尾行动引导",
      "6. 拍摄注意事项（灯光/收音/合规，植发内容尤其注意患者隐私与医疗合规）",
    ].join("\n");
    const script = await chatComplete(
      [
        { role: "system", content: sys + (skillContent ? `\n\n参考 skill：\n${skillContent.slice(0, 3500)}` : "") },
        { role: "user", content: user },
      ],
      cfg,
      { maxTokens: 2800, timeoutMs: 90000 }
    );
    return NextResponse.json({ script, type, typeName, modelPowered: true });
  } catch (e) {
    console.error("video script failed:", e);
    return NextResponse.json({ script: "", modelPowered: false, note: "生成失败，请重试。" });
  }
}
