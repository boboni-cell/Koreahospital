import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai-client";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { catalog, listSkills, resolveContents } from "@/lib/skills";
import { getAgentConfig, ASSISTANT_MODE_PROMPT } from "@/lib/agent";
import { loadContext, append } from "@/lib/daily-log";
import { contextHint } from "@/lib/page-context";
import { requireAgentPreconditions } from "@/lib/agent-contracts";

export const dynamic = "force-dynamic";

/**
 * 工作台总控 Agent（orchestrator / 页面助手）：
 *  - mode=orchestrate（默认）：任务决策 + skill 注入，跟旧版完全一致
 *  - mode=assistant：页面助手，注入 pageContext + daily-log 上下文，建议模式（不直接写库）
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = body.task || body.message || "";
  const input = body.input || {};
  const mode: "orchestrate" | "assistant" = body.mode === "assistant" ? "assistant" : "orchestrate";
  const pathname: string = input.pathname || "/";
  const imageDataUrl: string | undefined = input.image; // data:image/...;base64,...

  const all = await listSkills();
  const cat = catalog(all);
  const { systemPrompt } = await getAgentConfig();
  const strategistPre = requireAgentPreconditions("strategist");

  if (mode === "orchestrate") {
    if (all.length === 0) {
      return NextResponse.json({ ids: [], content: "", catalog: [], modelPowered: true, plan: null });
    }
    if (!strategistPre.ok) {
      return NextResponse.json({ ids: [], content: "", catalog: cat, modelPowered: false, plan: null, stopped: true, reason: strategistPre.reason });
    }
    try {
      const user = `任务：${task}\n附加信息：${JSON.stringify(input)}\n\n可用 skill 列表：\n${cat.map((s) => `- [${s.id}] ${s.name}：${s.description}`).join("\n")}\n\n请按你的 system prompt 输出决策。`;
      const text = await chatCompleteForAgent(
        "strategist",
        [{ role: "system", content: systemPrompt }, { role: "user", content: user }],
        { maxTokens: 900, timeoutMs: 60000 }
      );
      const plan = parseJsonBlock<{
        modelKind: "text" | "image" | "video";
        skills: string[];
        steps: string[];
        note: string;
      }>(text);
      const skillIds = (plan.skills || []).map((sid) => cat.find((s) => s.id === sid)?.id).filter((x): x is string => !!x);
      const content = await resolveContents(skillIds);
      append({ kind: "agent_msg", role: "strategist", text: `mode=orchestrate: ${task.slice(0, 80)} → skills=${skillIds.join(",")}` });
      return NextResponse.json({ ids: skillIds, content, catalog: cat, modelPowered: true, plan });
    } catch (e) {
      console.error("[orchestrator] 决策失败，退回 skill 目录", e);
      return NextResponse.json({ ids: [], content: "", catalog: cat, modelPowered: false, plan: null });
    }
  }

  // ===== mode = "assistant" =====
  if (!strategistPre.ok) {
    return NextResponse.json({ mode: "assistant", reply: "总 Agent（strategist）未配置真实模型，无法回复。请到「Agent 模型」配置。", draft: [], suggestions: [], powered: false });
  }

  // 拼 system：base + assistant 模式 + 当前页上下文 + 长期记忆
  const mem = loadContext();
  const pageHint = contextHint(pathname);
  const sys = [
    systemPrompt,
    ASSISTANT_MODE_PROMPT,
    pageHint,
    mem ? `\n${mem}` : "",
  ].filter(Boolean).join("\n\n");

  // 拼 user 消息：支持截图（多模态）
  const userContent: any =
    imageDataUrl
      ? [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: task || "请识别这张截图并给出建议" },
        ]
      : task;

  // 日志：用户输入
  append({ kind: "user_msg", text: task || "(empty)", page: pathname });

  try {
    const text = await chatCompleteForAgent(
      "strategist",
      [
        { role: "system", content: sys },
        { role: "user", content: userContent as any },
      ],
      { maxTokens: 1200, timeoutMs: 90000 }
    );
    // 优先按 JSON 草稿解析（draft/suggestions/next），失败则整段当文本回复
    let parsed: any = null;
    try { parsed = parseJsonBlock<any>(text); } catch { parsed = null; }
    append({ kind: "agent_msg", role: "strategist", text: text.slice(0, 200), page: pathname });
    return NextResponse.json({
      mode: "assistant",
      powered: true,
      reply: parsed?.summary || text,
      draft: parsed?.draft ?? [],
      suggestions: parsed?.suggestions ?? [],
      next: parsed?.next ?? null,
      raw: text,
    });
  } catch (e) {
    console.error("[assistant] 失败", e);
    append({ kind: "agent_msg", role: "strategist", text: `[ERR] ${String(e).slice(0, 100)}`, page: pathname });
    return NextResponse.json({ mode: "assistant", powered: false, reply: "请求失败,请稍后重试", draft: [], suggestions: [] });
  }
}

export async function GET() {
  const all = await listSkills();
  return NextResponse.json(catalog(all));
}