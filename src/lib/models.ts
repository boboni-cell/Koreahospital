import fs from "node:fs/promises";
import path from "node:path";
import type { AiConfig } from "./ai-config";

export type ModelKind = "text" | "image" | "video";

export interface ModelEntry {
  id: string;
  name: string;
  kind: ModelKind;
  /** API base，如 https://api.openai.com/v1 （不含末尾 /chat/completions） */
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

const PATH = path.join(process.cwd(), "data", "models.json");

async function readAll(): Promise<ModelEntry[]> {
  try {
    return JSON.parse(await fs.readFile(PATH, "utf-8")) as ModelEntry[];
  } catch {
    return [];
  }
}

async function writeAll(list: ModelEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(PATH), { recursive: true });
  await fs.writeFile(PATH, JSON.stringify(list, null, 2), "utf-8");
}

export function genId(): string {
  return "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function publicMasked(m: ModelEntry) {
  return { ...m, apiKey: m.apiKey ? "***已配置***" : "" };
}

export async function listModels(): Promise<ModelEntry[]> {
  return readAll();
}

export async function addModel(
  m: Omit<ModelEntry, "id" | "createdAt" | "isActive"> & { isActive?: boolean }
): Promise<ModelEntry> {
  const list = await readAll();
  const entry: ModelEntry = {
    ...m,
    id: genId(),
    createdAt: new Date().toISOString(),
    isActive: m.isActive ?? false,
  };
  const hasActive = list.some((x) => x.kind === entry.kind && x.isActive);
  if (!hasActive) entry.isActive = true; // 该类首个模型自动启用
  list.push(entry);
  await writeAll(list);
  return entry;
}

export async function updateModel(id: string, patch: Partial<ModelEntry>): Promise<void> {
  const list = await readAll();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch, id: list[i].id };
  await writeAll(list);
}

export async function deleteModel(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((x) => x.id !== id));
}

export async function setActive(id: string): Promise<void> {
  const list = await readAll();
  const target = list.find((x) => x.id === id);
  if (!target) return;
  for (const x of list) x.isActive = x.id === id;
  await writeAll(list);
}

export async function getActive(kind: ModelKind): Promise<ModelEntry | null> {
  const list = await readAll();
  return list.find((x) => x.kind === kind && x.isActive) ?? null;
}

/** 文本模型：若有激活的 text 模型则构造 AiConfig，否则返回 null（回退 ai-config） */
export async function getActiveTextConfig(): Promise<AiConfig | null> {
  const m = await getActive("text");
  if (!m) return null;
  return {
    baseUrl: chatEndpoint(m),
    apiKey: m.apiKey,
    model: m.model,
    enabled: true,
  };
}

export function chatEndpoint(m: ModelEntry): string {
  return m.baseUrl.replace(/\/$/, "") + "/chat/completions";
}
export function imageEndpoint(m: ModelEntry): string {
  return m.baseUrl.replace(/\/$/, "") + "/images/generations";
}
export function videoEndpoint(m: ModelEntry): string {
  return m.baseUrl.replace(/\/$/, "") + "/videos/generations";
}
export function modelsEndpoint(m: ModelEntry): string {
  return m.baseUrl.replace(/\/$/, "") + "/models";
}
