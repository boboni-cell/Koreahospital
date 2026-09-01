import db from "./db";
import type { ProviderId } from "./providers";

export type MediaKind = "image" | "video";

export interface MediaModel {
  id: number;
  kind: MediaKind;
  provider: ProviderId;
  base_url: string;
  api_key: string;
  model: string;
  is_mock: number;
  last_tested_at: string | null;
  last_test_status: number | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
}

export function publicMediaModel(m: MediaModel) {
  const { api_key, ...pub } = m;
  return { ...pub, api_key_set: Boolean(api_key) };
}

export function getMediaModel(kind: MediaKind): MediaModel {
  const row = db.prepare("SELECT * FROM media_models WHERE kind=?").get(kind) as MediaModel | undefined;
  if (row) return row;
  db.prepare(
    "INSERT OR IGNORE INTO media_models (kind, provider, base_url, api_key, model, is_mock) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(kind, "mock", "mock://local", "", "mock-1", 1);
  return db.prepare("SELECT * FROM media_models WHERE kind=?").get(kind) as MediaModel;
}

export function listMediaModels(): MediaModel[] {
  return db.prepare("SELECT * FROM media_models ORDER BY id ASC").all() as MediaModel[];
}

const VALID_PROVIDERS: ProviderId[] = ["mock","openai","deepseek","kimi","volcengine","doubao","qwen","zhipu","hunyuan","dashscope","siliconflow","moyu","agnes","atlascloud","fal","openrouter","minimax","minimax-cn","nanogpt","custom"];

export function upsertMediaModel(
  kind: MediaKind,
  patch: Partial<Pick<MediaModel, "provider" | "base_url" | "api_key" | "model" | "is_mock">>
): MediaModel {
  const cur = getMediaModel(kind);
  const nextProvider: ProviderId = (patch.provider && VALID_PROVIDERS.includes(patch.provider as ProviderId))
    ? (patch.provider as ProviderId)
    : (cur.provider || "mock");
  const apiKeyProvided = patch.api_key !== undefined ? patch.api_key : cur.api_key;
  const autoMock = nextProvider === "mock" || !apiKeyProvided ? 1 : 0;
  const isMock = patch.is_mock !== undefined ? patch.is_mock : autoMock;
  db.prepare(
    `UPDATE media_models SET provider=?, base_url=?, api_key=?, model=?, is_mock=?, updated_at=CURRENT_TIMESTAMP WHERE kind=?`
  ).run(nextProvider, patch.base_url ?? cur.base_url, apiKeyProvided, patch.model ?? cur.model, isMock, kind);
  return getMediaModel(kind);
}

export function recordMediaTest(kind: MediaKind, status: number | null, error: string | null): void {
  db.prepare(
    `UPDATE media_models SET last_tested_at=CURRENT_TIMESTAMP, last_test_status=?, last_test_error=? WHERE kind=?`
  ).run(status, error, kind);
}