import type { HotspotItem } from "./daily-hotspots";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function trendRadarConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.TRENDRADAR_MCP_URL?.trim());
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

export function normalizeTrendRadarResults(payload: Record<string, unknown>): HotspotItem[] {
  const nested = payload.data as any;
  const rows = Array.isArray(payload.results) ? payload.results : Array.isArray(payload.news) ? payload.news : Array.isArray(nested) ? nested : Array.isArray(nested?.results) ? nested.results : [];
  return rows.map((item: any, index: number) => ({
    rank: Number(item.rank ?? item.position) || index + 1, title: String(item.title ?? item.word ?? item.name ?? "").trim(),
    hotValue: String(item.hot_value ?? item.score ?? item.heat ?? item.frequency ?? ""), link: String(item.url ?? item.link ?? item.source_url ?? ""),
    detail: String(item.summary ?? item.description ?? item.snippet ?? ""), cover: String(item.cover ?? ""),
  })).filter((item: HotspotItem) => item.title).slice(0, 30);
}

export async function fetchTrendRadarHotspots(query: string, options: { fetchFn?: FetchLike; timeoutMs?: number } = {}) {
  const url = process.env.TRENDRADAR_MCP_URL?.trim();
  if (!url) throw new Error("未配置 TRENDRADAR_MCP_URL");
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs || 12_000;
  const init = await mcpPost(fetchFn, url, undefined, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "koreahospital", version: "0.1.0" } } }, timeoutMs);
  const sessionId = init.response.headers.get("mcp-session-id") || undefined;
  await mcpPost(fetchFn, url, sessionId, { jsonrpc: "2.0", method: "notifications/initialized", params: {} }, timeoutMs);
  const call = await mcpPost(fetchFn, url, sessionId, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_news", arguments: { query: query.slice(0, 120), search_mode: "keyword", limit: 30, include_url: true } } }, timeoutMs);
  return normalizeTrendRadarResults(resultPayload(call.result));
}
