import { NextRequest, NextResponse } from "next/server";
import { parseJsonBlock } from "@/lib/ai-client";
import { chatComplete, type ChatMessage } from "@/lib/ai-client";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { catalog, listSkills, resolveContents } from "@/lib/skills";
import { getAgentConfig, ASSISTANT_MODE_PROMPT } from "@/lib/agent";
import { getAgentModel } from "@/lib/agent-models";
import { loadContext, append } from "@/lib/daily-log";
import { contextHint, ocrSchemaHint } from "@/lib/page-context";
import { chatUrlFor, PROVIDERS, type ProviderId } from "@/lib/providers";
import "@/lib/page-schemas"; // side-effect: register schemas
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

  // 拼 system：截图场景用 OCR 专用 prompt（更短更精准），普通对话走通用 assistant sp
  const ocrHint = imageDataUrl ? ocrSchemaHint(pathname) : "";
  const mem = loadContext();
  const pageHint = contextHint(pathname);
  const sys = imageDataUrl
    ? [
        systemPrompt,
        // 截图 OCR 专用 prompt：硬约束 schema + 短回复
        `你是 OCR 字段抽取器。用户给你一张截图 + 当前页 schema，必须严格按 schema 字段名返 draft JSON。
只返一个 JSON 对象（不要 markdown、不要解释、不要寒暄）：
{"summary":"≤30 字概括截图内容","draft":[{"table":"...","fields":{...schema 内的字段名...}}],"suggestions":["≤2 条,如某字段看不清"]}
字段值类型严格按 schema（enum 用白名单值,看不出的填 null,不要猜）。
不返任何 schema 外字段,不要 Markdown 表格。`,
        ocrHint,
      ].filter(Boolean).join("\n\n")
    : [
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
    let text: string;

    if (imageDataUrl) {
      // OCR 场景：绕开 chatCompleteForAgent 的 mock fallback，直接调 chatComplete 让 4xx/5xx 真的抛出来
      const m = getAgentModel("strategist");
      if (!m.api_key) throw new Error("strategist 未配置 api_key");
      const provider = (m.provider || "mock") as ProviderId;
      const baseOverride = provider === "custom" ? m.base_url : (PROVIDERS[provider]?.chat ?? m.base_url);
      const endpoint = chatUrlFor(provider, baseOverride);
      text = await chatComplete(
        [
          { role: "system", content: sys },
          { role: "user", content: userContent as any },
        ],
        { baseUrl: endpoint, apiKey: m.api_key, model: m.model, enabled: true },
        { maxTokens: 800, timeoutMs: 90000 }
      );
    } else {
      text = await chatCompleteForAgent(
        "strategist",
        [
          { role: "system", content: sys },
          { role: "user", content: task },
        ],
        { maxTokens: 1200, timeoutMs: 90000 }
      );
    }

    // OCR 场景强制按 JSON 解析（不 fallback 文本），普通对话允许 fallback
    let parsed: any = null;
    if (imageDataUrl) {
      try { parsed = JSON.parse(text); } catch { parsed = parseJsonBlock<any>(text); }
    } else {
      try { parsed = parseJsonBlock<any>(text); } catch { parsed = null; }
    }
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
      const errStr = String((e as Error)?.message || e).slice(0, 200);
      append({ kind: "agent_msg", role: "strategist", text: `[ERR] ${errStr}`, page: pathname });
      // 截图场景下如果因为模型不支持 vision 而 fallback mock，明确告诉用户
      if (imageDataUrl) {
        return NextResponse.json({
          mode: "assistant",
          powered: false,
          reply: "截图识别失败：当前 strategist 模型不支持 vision。\n\n到「Agent 模型」把 strategist 换成支持 vision 的（如 doubao-1.5-vision-pro / deepseek-vl）。",
          draft: [],
          suggestions: ["先在设置页改模型", "或直接告诉我字段内容,我手写草稿"],
          visionRequired: true,
        });
      }
      return NextResponse.json({ mode: "assistant", powered: false, reply: "请求失败,请稍后重试", draft: [], suggestions: [] });
    }
  }

export async function GET() {
  const all = await listSkills();
  return NextResponse.json(catalog(all));
}