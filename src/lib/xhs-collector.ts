import { spawn } from "node:child_process";
import path from "node:path";
import db from "@/lib/db";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { getAgentModel } from "@/lib/agent-models";

export async function refineXhsQuery(input: string) {
  const original = String(input || "").trim().slice(0, 200);
  const model = getAgentModel("researcher");
  if (!original || model.is_mock) return original;
  try {
    const text = await chatCompleteForAgent("researcher", [
      { role: "system", content: "你是小红书研究员。把用户的自然语言需求改成一个适合小红书搜索的精确关键词短语：保留核心主题，补充人群/场景/时间或内容类型，最多 40 字。只输出关键词，不要解释，不要引号。" },
      { role: "user", content: original },
    ], { maxTokens: 80, timeoutMs: 30000 });
    const refined = text.replace(/[\r\n"“”`]/g, " ").replace(/^关键词[:：]\s*/i, "").trim().slice(0, 120);
    return refined || original;
  } catch {
    return original;
  }
}

export function startXhsCollection(taskId: number, keywords: string) {
  const script = path.join(process.cwd(), "scripts", "xhs-collector.mjs");
  const child = spawn(process.execPath, [script, "--task-id", String(taskId), "--keywords", keywords], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env, KOREAHOSPITAL_READ_ONLY: "1" },
  });
  child.unref();
  return child.pid ?? null;
}

export async function collectXhsNow(taskId: number, keywords: string, timeoutMs = 120000) {
  startXhsCollection(taskId, keywords);
  return waitForCollection(taskId, timeoutMs);
}

export async function waitForCollection(taskId: number, timeoutMs = 120000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const task = db.prepare("SELECT * FROM research_tasks WHERE id=?").get(taskId) as any;
    if (!task || task.status === "completed" || task.status === "failed") return task;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return db.prepare("SELECT * FROM research_tasks WHERE id=?").get(taskId) as any;
}
