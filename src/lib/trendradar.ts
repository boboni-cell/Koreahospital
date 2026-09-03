import { spawn } from "node:child_process";
import type { HotspotItem } from "./daily-hotspots";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function trendRadarConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.TRENDRADAR_MCP_URL?.trim());
}

let startPromise: Promise<void> | null = null;

async function mcpReachable(url: string) {
  try {
    await fetch(url, { headers: { accept: "application/json, text/event-stream" }, signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function ensureTrendRadarMcp() {
  const url = process.env.TRENDRADAR_MCP_URL?.trim();
  if (!url || await mcpReachable(url)) return;
  const root = process.env.TRENDRADAR_DIR?.trim();
  if (!root) return;
  const parsed = new URL(url);
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return;
  if (!startPromise) {
    startPromise = (async () => {
      const child = spawn(process.env.TRENDRADAR_UV || "uv", ["run", "python", "-m", "mcp_server.server", "--transport", "http", "--host", parsed.hostname, "--port", parsed.port || "3333"], {
        cwd: root, detached: true, stdio: "ignore", env: process.env,
      });
      child.unref();
      for (let i = 0; i < 15; i++) {
        if (await mcpReachable(url)) return;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error("TrendRadar MCP 自动启动超时");
    })().finally(() => { startPromise = null; });
  }
  await startPromise;
}

function parseSse(text: string): Record<string, unknown> {
  const frames = text.split(/\n\n+/).flatMap((frame) => frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()));
  const data = frames.reverse().find((value) => value && value !== "[DONE]");
  if (!data) throw new Error("TrendRadar MCP 没有返回结果");
  return JSON.parse(data) as Record<string, unknown>;
}

async function mcpPost(fetchFn: FetchLike, url: string, sessionId: string | undefined, body: Record<string, unknown>, timeoutMs: number) {
  const response = await fetchFn(url, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(sessionId ? { "mcp-session-id": sessionId } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`TrendRadar MCP HTTP ${response.status}`);
  return { response, result: text ? parseSse(text) : null };
}

function resultPayload(result: Record<string, unknown> | null) {
  const payload = ((result?.result || result) as any)?.content;
  const text = Array.isArray(payload) ? payload.find((item: any) => item?.type === "text")?.text : null;
  if (!text) throw new Error("TrendRadar MCP 返回格式不完整");
  return JSON.parse(text) as Record<string, unknown>;
}

async function callTrendRadarTool(fetchFn: FetchLike, url: string, name: string, args: Record<string, unknown>, timeoutMs: number) {
  const init = await mcpPost(fetchFn, url, undefined, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "koreahospital", version: "0.1.0" } } }, timeoutMs);
  const sessionId = init.response.headers.get("mcp-session-id") || undefined;
  await mcpPost(fetchFn, url, sessionId, { jsonrpc: "2.0", method: "notifications/initialized", params: {} }, timeoutMs);
  const call = await mcpPost(fetchFn, url, sessionId, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }, timeoutMs);
  return resultPayload(call.result);
}

export async function triggerTrendRadarCrawl(options: { fetchFn?: FetchLike; timeoutMs?: number } = {}) {
  const url = process.env.TRENDRADAR_MCP_URL?.trim();
  if (!url) throw new Error("未配置 TRENDRADAR_MCP_URL");
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs || 120_000;
  if (!options.fetchFn) await ensureTrendRadarMcp();
  return callTrendRadarTool(fetchFn, url, "trigger_crawl", { save_to_local: true, include_url: true }, timeoutMs);
}

export function normalizeTrendRadarResults(payload: Record<string, unknown>): HotspotItem[] {
  const nested = payload.data as any;
  const rows = Array.isArray(payload.results) ? payload.results : Array.isArray(payload.news) ? payload.news : Array.isArray(nested) ? nested : Array.isArray(nested?.results) ? nested.results : [];
  return rows.map((item: any, index: number) => ({
    rank: Number(item.rank ?? item.position) || index + 1, title: String(item.title ?? item.word ?? item.name ?? "").trim(),
    hotValue: String(item.hot_value ?? item.score ?? item.heat ?? item.frequency ?? ""), link: String(item.url ?? item.link ?? item.source_url ?? ""),
    detail: String(item.summary ?? item.description ?? item.snippet ?? ""), cover: String(item.cover ?? ""),
  })).filter((item: HotspotItem) => item.title).slice(0, 30);
}

export async function fetchTrendRadarHotspots(query: string, options: { fetchFn?: FetchLike; timeoutMs?: number; refresh?: boolean } = {}) {
  const url = process.env.TRENDRADAR_MCP_URL?.trim();
  if (!url) throw new Error("未配置 TRENDRADAR_MCP_URL");
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs || 12_000;
  if (!options.fetchFn) await ensureTrendRadarMcp();
  if (options.refresh) await triggerTrendRadarCrawl({ fetchFn, timeoutMs: Math.max(timeoutMs, 120_000) });
  const payload = await callTrendRadarTool(fetchFn, url, "search_news", { query: query.slice(0, 120), search_mode: "keyword", limit: 30, include_url: true }, timeoutMs);
  return normalizeTrendRadarResults(payload);
}
