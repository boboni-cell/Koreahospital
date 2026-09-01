import db from "./db";
import type { ProviderId } from "./providers";

export type AgentRole = "researcher" | "strategist" | "writer" | "designer" | "publisher" | "analyst";

export interface AgentModel {
  id: number;
  role: AgentRole;
  provider: ProviderId;
  base_url: string;
  api_key: string;
  model: string;
  kind: "text" | "image" | "video";
  is_mock: number;
  last_tested_at: string | null;
  last_test_status: number | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
}

export function publicAgentModel(m: AgentModel) {
  const { api_key, ...pub } = m;
  return { ...pub, api_key_set: Boolean(api_key) };
}

/** 缺位即建 mock；返回单条记录 */
export function getAgentModel(role: AgentRole): AgentModel {
  const row = db.prepare("SELECT * FROM agent_models WHERE role=?").get(role) as AgentModel | undefined;
  if (row) return row;
  db.prepare(
    "INSERT OR IGNORE INTO agent_models (role, provider, base_url, api_key, model, kind, is_mock) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(role, "mock", "mock://local", "", "mock-1", "text", 1);
  return db.prepare("SELECT * FROM agent_models WHERE role=?").get(role) as AgentModel;
}

export function listAgentModels(): AgentModel[] {
  return db.prepare("SELECT * FROM agent_models ORDER BY id ASC").all() as AgentModel[];
}

const VALID_PROVIDERS: ProviderId[] = ["mock","openai","deepseek","kimi","volcengine","dashscope","siliconflow","openrouter","minimax","nanogpt","custom"];

export function upsertAgentModel(
  role: AgentRole,
  patch: Partial<Pick<AgentModel, "provider" | "base_url" | "api_key" | "model" | "kind" | "is_mock">>
): AgentModel {
  const cur = getAgentModel(role);
  const nextProvider: ProviderId = (patch.provider && VALID_PROVIDERS.includes(patch.provider as ProviderId))
    ? (patch.provider as ProviderId)
    : (cur.provider || "mock");
  // 自动派生 is_mock：有 provider=mock 或缺 api_key 视为 mock
  const apiKeyProvided = patch.api_key !== undefined ? patch.api_key : cur.api_key;
  const autoMock = nextProvider === "mock" || !apiKeyProvided ? 1 : 0;
  const isMock = patch.is_mock !== undefined ? patch.is_mock : autoMock;
  const next = {
    provider: nextProvider,
    base_url: patch.base_url ?? cur.base_url,
    api_key: apiKeyProvided,
    model: patch.model ?? cur.model,
    kind: patch.kind ?? cur.kind,
    is_mock: isMock,
  };
  db.prepare(
    `UPDATE agent_models SET provider=?, base_url=?, api_key=?, model=?, kind=?, is_mock=?, updated_at=CURRENT_TIMESTAMP WHERE role=?`
  ).run(next.provider, next.base_url, next.api_key, next.model, next.kind, next.is_mock, role);
  return getAgentModel(role);
}

export function recordTest(role: AgentRole, status: number | null, error: string | null): void {
  db.prepare(
    `UPDATE agent_models SET last_tested_at=CURRENT_TIMESTAMP, last_test_status=?, last_test_error=? WHERE role=?`
  ).run(status, error, role);
}