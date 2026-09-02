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
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { AGENT_ROLES } from "@/lib/agent-labels";

export const dynamic = "force-dynamic";

type OrchestrationPlan = {
  modelKind: "text" | "image" | "video";
  skills: string[];
  steps: Array<string | { role?: string; text?: string; skillIds?: string[] }>;
  note: string;
};

function minimumPlan(task: string): OrchestrationPlan {
  const text = String(task || "");
  if (/收集|采集|抓取|后台数据|账号数据/.test(text)) {
    return { modelKind: "text", skills: [], steps: [{ role: "analyst", text: "通过只读采集工具收集相关账号或帖子数据，并返回采集状态与来源。" }], note: "策略师输出格式修复失败，已生成最小可执行计划。" };
  }
  if (/热点|搜索|来源|竞品|资料|趋势|舆情|研究|小红书/.test(text)) {
    return { modelKind: "text", skills: [], steps: [{ role: "researcher", text: "搜索并整理与任务相关的近期公开信息，返回可验证来源。" }], note: "策略师输出格式修复失败，已生成最小可执行计划。" };
  }
  return { modelKind: "text", skills: [], steps: [{ role: "strategist", text: "拆解用户任务，明确下一步负责人、产出和验收标准。" }], note: "策略师输出格式修复失败，已生成最小可执行计划。" };
}

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
      let plan: OrchestrationPlan;
      let formatWarning = false;
      let formatError = "";
      try {
        plan = parseJsonBlock<OrchestrationPlan>(text);
        if (!Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error("策略师返回的计划没有可执行步骤");
      } catch (firstError) {
        formatWarning = true;
        formatError = String((firstError as Error)?.message || firstError).slice(0, 240);
        try {
          const repaired = await chatCompleteForAgent(
            "strategist",
            [
              { role: "system", content: "你是执行计划格式修复器。把用户提供的策略师回复转换为严格 JSON。只输出一个 JSON 对象，不要 markdown，不要解释。字段必须是 modelKind(text|image|video)、skills(字符串数组)、steps(数组，每项含 role 和 text)、note(字符串)。role 只能是 researcher、strategist、writer、designer、publisher、analyst。" },
              { role: "user", content: `原任务：${task}\n策略师原回复：${text.slice(0, 12000)}` },
            ],
            { maxTokens: 900, timeoutMs: 60000 }
          );
          plan = parseJsonBlock<OrchestrationPlan>(repaired);
          if (!Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error("修复结果没有可执行步骤");
          plan.note = [plan.note, `策略师原始输出格式异常，已自动修复（${formatError}）。`].filter(Boolean).join(" ");
        } catch (repairError) {
          const reason = String((repairError as Error)?.message || repairError).slice(0, 240);
          plan = minimumPlan(task);
          plan.note = `${plan.note} 原始输出：${formatError}；自动修复：${reason}`;
        }
      }
      const skillIds = (plan.skills || []).map((sid) => cat.find((s) => s.id === sid)?.id).filter((x): x is string => !!x);
      const content = await resolveContents(skillIds);
      const inferRole = (text: string) => {
        if (/收集|采集|抓取|后台数据|账号数据/.test(text)) return "analyst";
        if (/热点|搜索|来源|竞品|资料|趋势|舆情|研究/.test(text)) return "researcher";
        if (/策略|筛选|优先级|定位|方向|规划/.test(text)) return "strategist";
        if (/封面|配图|视觉|设计|图片|海报|分镜/.test(text)) return "designer";
        if (/发布|排期|发布包|上线/.test(text)) return "publisher";
        if (/数据|分析|复盘|报告|归因/.test(text)) return "analyst";
        return plan.modelKind === "text" ? "writer" : "designer";
      };
      const steps = (plan.steps || []).map((raw) => {
        const item = typeof raw === "string" ? { text: raw } : raw;
        const text = String(item.text || "").trim();
        const role = /收集|采集|抓取|后台数据|账号数据/.test(text) ? "analyst" : AGENT_ROLES.includes(item.role || "") ? item.role! : inferRole(text);
        return { text, status: "pending", role, skillIds: (item.skillIds || skillIds).filter((sid) => skillIds.includes(sid)), result: null, error: null };
      }).filter((s) => s.text);
      if (steps.length === 0) return NextResponse.json({ error: "策略师没有生成可执行步骤", catalog: cat, modelPowered: true }, { status: 422 });
      // 持久化：G2 模式下 plan 可被前端逐步执行
      const pid = getCurrentProjectId();
      const info = db.prepare(
        "INSERT INTO agent_plans (project_id, task, steps_json, note, status) VALUES (?, ?, ?, ?, ?)"
      ).run(pid, task.slice(0, 500), JSON.stringify(steps), plan.note ?? null, "pending");
      const planId = Number(info.lastInsertRowid);
      append({ kind: "agent_msg", role: "strategist", text: `plan #${planId} created: ${steps.length} steps (${plan.modelKind})` });
      return NextResponse.json({ ids: skillIds, content, catalog: cat, modelPowered: true, plan, planId, steps, formatWarning, formatError });
    } catch (e) {
      console.error("[orchestrator] 决策失败，退回 skill 目录", e);
      const reason = String((e as Error)?.message || e).slice(0, 240);
      return NextResponse.json({ error: "策略师规划失败，请稍后重试", reason, ids: [], content: "", catalog: cat, modelPowered: false, plan: null }, { status: 502 });
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
