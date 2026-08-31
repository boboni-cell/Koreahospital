import { NextRequest, NextResponse } from "next/server";
import { readAiConfig } from "@/lib/ai-config";
import { getActiveTextConfig } from "@/lib/models";
import { chatComplete, parseJsonBlock } from "@/lib/ai-client";
import { catalog, listSkills, resolveContents } from "@/lib/skills";
import { getAgentConfig } from "@/lib/agent";
import { getProjectContext } from "@/lib/project-context";
import { requireAgentPreconditions } from "@/lib/agent-contracts";

export const dynamic = "force-dynamic";

/**
 * 工作台总控 Agent（orchestrator）：
 * 用可配置的 system prompt，判断一个任务 该用哪类模型 + 哪些 skill + 执行步骤，
 * 并返回已命中的 skill 正文（供后续生成直接注入）。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = body.task || "";
  const input = body.input || {};
  const all = await listSkills();
  const cat = catalog(all);
  const { systemPrompt } = await getAgentConfig();

  if (all.length === 0) {
    return NextResponse.json({ ids: [], content: "", catalog: [], modelPowered: true, plan: null });
  }

  const cfg = (await getActiveTextConfig()) ?? (await readAiConfig());

  // 未接模型：退化，把 skill 目录回给前端，让下一步生成仍可正常走
  if (!cfg.enabled) {
    return NextResponse.json({ ids: [], content: "", catalog: cat, modelPowered: false, plan: null });
  }

  try {
    const projectCtx = getProjectContext();
    const pre = requireAgentPreconditions("strategist");
    if (!pre.ok) {
      return NextResponse.json({ ids: [], content: "", catalog: cat, modelPowered: false, plan: null, stopped: true, reason: pre.reason });
    }
    const user = `任务：${task}\n附加信息：${JSON.stringify(input)}\n\n${projectCtx}\n\n可用 skill 列表：\n${cat.map((s) => `- [${s.id}] ${s.name}：${s.description}`).join("\n")}\n\n请按你的 system prompt 输出决策。`;
    const text = await chatComplete(
      [{ role: "system", content: systemPrompt }, { role: "user", content: user }],
      cfg,
      { maxTokens: 900, timeoutMs: 60000 }
    );
    const plan = parseJsonBlock<{
      modelKind: "text" | "image" | "video";
      skills: string[];
      steps: string[];
      note: string;
    }>(text);

    // 命中 skills 的正文（作为该任务的 skill 注入缓冲），上限 6000 字
    const skillIds = (plan.skills || [])
      .map((sid) => cat.find((s) => s.id === sid)?.id)
      .filter((x): x is string => !!x);
    const content = await resolveContents(skillIds);
    return NextResponse.json({ ids: skillIds, content, catalog: cat, modelPowered: true, plan });
  } catch (e) {
    console.error("[orchestrator] 决策失败，退回 skill 目录", e);
    return NextResponse.json({ ids: [], content: "", catalog: cat, modelPowered: false, plan: null });
  }
}

export async function GET() {
  const all = await listSkills();
  return NextResponse.json(catalog(all));
}
