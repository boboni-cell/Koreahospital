import { spawn } from "node:child_process";
import path from "node:path";
import db from "@/lib/db";

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

export async function waitForCollection(taskId: number, timeoutMs = 120000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const task = db.prepare("SELECT * FROM research_tasks WHERE id=?").get(taskId) as any;
    if (!task || task.status === "completed" || task.status === "failed") return task;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return db.prepare("SELECT * FROM research_tasks WHERE id=?").get(taskId) as any;
}
