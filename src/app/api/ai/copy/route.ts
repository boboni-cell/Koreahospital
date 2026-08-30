import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete, parseJsonBlock } from "@/lib/ai-client";
import { selectSkillIds, resolveContents } from "@/lib/skills";
import {
  buildCopySystem,
  buildSingleRoleUser,
  buildScoreSystem,
  buildScoreUser,
  ROLE_ORDER,
  type CopyInput,
} from "@/lib/ai-prompts";

async function genOne(
  p: CopyInput,
  role: string,
  cfg: Awaited<ReturnType<typeof readAiConfig>>,
  skillContent: string
) {
  const text = await chatComplete(
    [
      { role: "system", content: buildCopySystem(skillContent) },
      { role: "user", content: buildSingleRoleUser(p, role) },
    ],
    cfg,
    { maxTokens: 2000, timeoutMs: 110000 }
  );
  const j = parseJsonBlock<{ title: string; body: string; tags: string[] }>(text);
  return { role, title: j.title || "", body: j.body || "", tags: j.tags || [] };
}

async function scoreOne(
  v: { role: string; title: string; body: string },
  cfg: Awaited<ReturnType<typeof readAiConfig>>
) {
  const stext = await chatComplete(
    [
      { role: "system", content: buildScoreSystem() },
      { role: "user", content: buildScoreUser(v.role, v.title, v.body) },
    ],
    cfg,
    { maxTokens: 2000, timeoutMs: 110000 }
  );
  const sj = parseJsonBlock<{
    scores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    tips: string[];
  }>(stext);
  const vals = Object.values(sj.scores || {});
  const total = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  return { total, scores: sj.scores || {}, tips: sj.tips || [] };
}

export async function POST(req: NextRequest) {
  const input: CopyInput = await req.json();
  const cfg = (await getActiveTextConfig()) ?? (await readAiConfig());

  // 用户可自选角色（多选）；未选则默认全部
  const roles = input.roles && input.roles.length ? input.roles : ROLE_ORDER;

  // Q2=a：生成前用 agent 混合选择本次需要的 skill（高频静态 + 模型动态挑），只注入命中的内容
  let skillContent = "";
  try {
    const { ids } = await selectSkillIds("生成文案", {
      ...(input as Record<string, unknown>),
      roles,
    });
    skillContent = await resolveContents(ids);
  } catch (e) {
    console.warn("[agent] skill 注入跳过", e);
  }

  if (!cfg.enabled) {
    return NextResponse.json(templateCopy(input));
  }
  try {
    const variants = await Promise.all(roles.map((r) => genOne(input, r, cfg, skillContent)));
    const scored = await Promise.all(variants.map((v) => scoreOne(v, cfg)));
    const merged = variants.map((v, i) => ({ ...v, score: scored[i] }));
    return NextResponse.json({ variants: merged, roles, modelPowered: true });
  } catch (e) {
    console.error("AI copy failed:", e);
    return NextResponse.json(templateCopy(input));
  }
}

function templateCopy(p: CopyInput) {
  const platform = p.platform === "douyin" ? "抖音" : "小红书";
  const variants = ROLE_ORDER.map((role) => ({
    role,
    title: `[模板] ${role} · ${p.surgery || "植发"} 案例分享`,
    body: `（未接入模型，这是模板文案）患者编号 ${p.patientId || "—"}，${p.surgery || "植发"} 术后 ${p.days || "180"} 天。亮点：${p.highlight || "发际线自然"}。`,
    tags: ["植发", "毛发移植", "案例"],
    score: { total: 6, scores: { 钩子: 6, 信息密度: 6, 合规: 8, 平台适配: 6, 转化: 5 }, tips: ["接入模型后自动生成打分"] },
  }));
  return { variants, modelPowered: false };
}
