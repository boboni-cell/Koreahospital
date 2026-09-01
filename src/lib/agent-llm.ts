import { chatComplete as legacyChatComplete, parseJsonBlock, type ChatMessage, type ChatOptions } from "./ai-client";
import { getAgentModel, type AgentRole } from "./agent-models";
import { recordAction } from "./workflow-actions";
import { PROVIDERS, chatUrlFor, type ProviderId } from "./providers";

/** 按 agent role + provider 派生真实 endpoint；mock 一律走 mock 占位 */
function resolveConfig(role: AgentRole) {
  const m = getAgentModel(role);
  const provider = (m.provider || "mock") as ProviderId;
  // 自动推导：如果 provider=mock 或 api_key 空 → 走 mock
  if (provider === "mock" || !m.api_key) {
    return { mock: true as const, model: m, provider };
  }
  const tpl = PROVIDERS[provider];
  const baseOverride = provider === "custom" ? m.base_url : (tpl?.chat ?? m.base_url);
  return {
    mock: false as const,
    model: m,
    provider,
    endpoint: chatUrlFor(provider, baseOverride),
  };
}

/** 确定性 mock：基于任务关键词返回结构化文本，确保下游 parseJsonBlock 能解析 */
function mockText(role: AgentRole, messages: ChatMessage[]): string {
  const user = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const hint = user.slice(0, 80);
  return JSON.stringify(
    {
      role,
      mock: true,
      note: `mock-1 占位返回（${role} 未接真实模型）。输入前缀：${hint}`,
      variants: [
        { role, title: `[Mock1] ${role} 标题`, body: `[Mock1] ${role} 文案正文：${hint}`, tags: ["mock", role] },
      ],
    },
    null,
    2
  );
}

/** 给定 agent role 调模型。mock/失败 → 返回 mock 内容并写 workflow_actions */
export async function chatCompleteForAgent(
  role: AgentRole,
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const cfg = resolveConfig(role);
  if (cfg.mock) {
    const txt = mockText(role, messages);
    recordAction({
      objectType: "agent_call",
      objectId: null,
      action: "agent.call.mock",
      detail: `role=${role} provider=${cfg.provider} 走 mock（未配置真实模型）`,
    });
    return txt;
  }
  try {
    const txt = await legacyChatComplete(messages, {
      baseUrl: cfg.endpoint,
      apiKey: cfg.model.api_key,
      model: cfg.model.model,
      enabled: true,
    }, opts);
    recordAction({
      objectType: "agent_call",
      objectId: null,
      action: "agent.call.real",
      detail: `role=${role} provider=${cfg.provider} 模型=${cfg.model.model}`,
    });
    return txt;
  } catch (e) {
    const err = String((e as Error)?.message || e).slice(0, 200);
    recordAction({
      objectType: "agent_call",
      objectId: null,
      action: "agent.call.fallback_mock",
      detail: `role=${role} provider=${cfg.provider} 真实调用失败：${err}`,
    });
    return mockText(role, messages);
  }
}

/** 重新导出以便调用方不必同时 import 两个 */
export { parseJsonBlock };
export type { ChatMessage, ChatOptions };
export type { AgentRole };