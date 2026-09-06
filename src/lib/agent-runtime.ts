import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import db from "./db.ts";
import { chatComplete, type ChatMessage } from "./ai-client.ts";

const execFileAsync = promisify(execFile);

export type AgentRuntimeMode = "agent_models" | "local_codex" | "openai_api";

export interface AgentRuntimeConfig {
  mode: AgentRuntimeMode;
  model: string;
  base_url: string;
  api_key: string;
}

export function getAgentRuntime(): AgentRuntimeConfig {
  return db.prepare("SELECT mode, model, base_url, api_key FROM agent_runtime WHERE id=1").get() as AgentRuntimeConfig;
}

export function publicAgentRuntime(config = getAgentRuntime()) {
  return { mode: config.mode, model: config.model, base_url: config.base_url, api_key_set: Boolean(config.api_key) };
}

export function updateAgentRuntime(patch: Partial<AgentRuntimeConfig>): AgentRuntimeConfig {
  const current = getAgentRuntime();
  const mode = patch.mode && ["agent_models", "local_codex", "openai_api"].includes(patch.mode) ? patch.mode : current.mode;
  const next = {
    mode,
    model: patch.model?.trim() || current.model,
    base_url: patch.base_url?.trim() || current.base_url,
    api_key: patch.api_key ?? current.api_key,
  };
  db.prepare("UPDATE agent_runtime SET mode=?, model=?, base_url=?, api_key=?, updated_at=CURRENT_TIMESTAMP WHERE id=1")
    .run(next.mode, next.model, next.base_url, next.api_key);
  return getAgentRuntime();
}

function candidateCodexPaths(): string[] {
  const fromPath = (process.env.PATH || "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "codex"));
  return [process.env.CODEX_CLI_PATH, process.env.CODEX_BIN, ...fromPath, path.join(os.homedir(), ".local/bin/codex"), "/opt/homebrew/bin/codex", "/usr/local/bin/codex"]
    .filter((value): value is string => Boolean(value));
}

export function findCodexCli(): string | null {
  return candidateCodexPaths().find((candidate) => {
    try { return fs.statSync(candidate).isFile() && (process.platform === "win32" || Boolean(fs.statSync(candidate).mode & 0o111)); }
    catch { return false; }
  }) || null;
}

async function command(command: string, args: string[], timeout = 10000) {
  try {
    const result = await execFileAsync(command, args, { timeout, maxBuffer: 2 * 1024 * 1024, encoding: "utf8" });
    return { ok: true, stdout: String(result.stdout || ""), stderr: String(result.stderr || "") };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, stdout: String(e.stdout || ""), stderr: String(e.stderr || e.message || "") };
  }
}

export async function getCodexStatus() {
  const cli = findCodexCli();
  if (!cli) return { available: false, authenticated: false, reason: "未检测到 Codex CLI，请先安装并登录。" };
  const version = await command(cli, ["--version"]);
  const login = await command(cli, ["login", "status"]);
  const detail = (login.stdout || login.stderr).trim().split("\n")[0]?.slice(0, 180) || "未登录";
  return {
    available: true,
    authenticated: login.ok,
    path: cli,
    version: (version.stdout || version.stderr).trim().split("\n")[0]?.slice(0, 100),
    reason: login.ok ? detail : "Codex CLI 已安装，但当前电脑尚未登录。",
  };
}

export async function runLocalCodex(messages: ChatMessage[], model: string): Promise<string> {
  const cli = findCodexCli();
  if (!cli) throw new Error("未检测到 Codex CLI，请先安装并登录。");
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "koreahospital-codex-"));
  const outputPath = path.join(tempDir, "last-message.txt");
  const prompt = [
    "你是 Koreahospital 的 Agent。只完成下面的文本任务，不要修改文件、执行外部写入、发布内容或操作账号。请直接返回最终答案，保留用户要求的 JSON 格式。",
    ...messages.map((message) => `\n${message.role.toUpperCase()}:\n${message.content}`),
  ].join("\n");
  try {
    const result = await command(cli, ["exec", "--ephemeral", "--skip-git-repo-check", "--color", "never", "-s", "read-only", "-m", model, "-o", outputPath, prompt], 120000);
    if (!result.ok) throw new Error(result.stderr.slice(0, 240) || "Codex CLI 执行失败");
    const output = (await fs.promises.readFile(outputPath, "utf8").catch(() => "")).trim();
    if (!output) throw new Error("Codex CLI 未返回内容");
    return output;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runOpenAiApi(messages: ChatMessage[], config: AgentRuntimeConfig): Promise<string> {
  if (!config.api_key) throw new Error("尚未填写 OpenAI API Key");
  return chatComplete(messages, { baseUrl: config.base_url, apiKey: config.api_key, model: config.model, enabled: true });
}
