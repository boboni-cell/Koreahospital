import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";

/**
 * 选题 → AI 视频脚本（feature 5）：agent 调 video-storyboard skill 产出拍摄脚本
 * （分镜/口播/B-roll/拍摄清单），供后续实拍。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const topic = body.topic || {};
  const title = topic.title || "";
  const description = topic.description || "";
  const role = topic.role || "viral";
  const platform = topic.platform || "douyin";

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

  try {
    const sys = [
      "你是短视频导演。根据一个选题，产出一份可直接拿去拍摄的完整视频脚本。",
      "覆盖：开场钩子、分镜（景别/画面/运镜/时长）、口播词、B-roll 镜头、结尾行动、拍摄注意事项。",
      "适配目标平台：小红书（9:16 竖版）/ 抖音口播。",
      "纯文本输出，markdown 分节，不要 JSON。",
    ];
    const user = [
      `选题：${title}`,
      `说明：${description || "（无）"}`,
      `账号角色：${role}`,
      `平台：${platform}`,
      "",
      "按以下结构输出：",
      "1. 一句话核心创意思路",
      "2. 分镜表（镜头号｜景别｜画面｜运镜｜时长｜口播/字幕）",
      "3. 开场钩子（前3秒）",
      "4. B-roll 镜头清单",
      "5. 结尾行动引导",
      "6. 拍摄注意事项与合规提醒",
    ].join("\n");
    const script = await chatComplete(
      [
        { role: "system", content: sys + (skillContent ? `\n\n参考 skill：\n${skillContent.slice(0, 3500)}` : "") },
        { role: "user", content: user },
      ],
      cfg,
      { maxTokens: 2500, timeoutMs: 90000 }
    );
    return NextResponse.json({ script, modelPowered: true });
  } catch (e) {
    console.error("video script failed:", e);
    return NextResponse.json({ script: "", modelPowered: false, note: "生成失败，请重试。" });
  }
}
