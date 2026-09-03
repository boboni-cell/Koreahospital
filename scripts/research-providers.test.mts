import assert from "node:assert/strict";
import test from "node:test";
import { findChubbySource, parseChubbyMarkdown, sourcePlatform, validateChubbySource } from "../src/lib/chubby-skills.ts";
import { fetchTrendRadarHotspots, normalizeTrendRadarResults } from "../src/lib/trendradar.ts";

test("ChubbySkills 研究资料解析保留正文、来源和媒体类型", () => {
  const material = parseChubbyMarkdown("---\ntitle: 示例视频\nplatform: douyin\nauthor: 作者\nnote_type: video\nlikes: 12\nprocessed_at: 2026-09-03T10:00:00+08:00\n---\n# 示例视频\n\n## 视频文字稿\n正文", "https://www.douyin.com/video/1");
  assert.equal(material.platform, "douyin"); assert.equal(material.media.type, "video"); assert.equal(material.metrics.likes, 12); assert.match(material.text, /视频文字稿/);
});

test("ChubbySkills 只接受已识别的平台公开链接", () => {
  assert.equal(sourcePlatform("https://www.xiaohongshu.com/explore/1"), "xiaohongshu");
  assert.equal(validateChubbySource("https://example.com/a"), "暂不支持该平台链接");
  assert.equal(validateChubbySource("file:///tmp/a"), "只允许 http(s) 公开链接");
});

test("研究员只从用户任务中提取已识别平台的公开来源", () => {
  assert.equal(findChubbySource("请研究 https://www.xiaohongshu.com/explore/1。"), "https://www.xiaohongshu.com/explore/1");
  assert.equal(findChubbySource("请研究 https://example.com/a"), null);
});

test("TrendRadar MCP 返回结果映射为现有热点模型", () => {
  assert.deepEqual(normalizeTrendRadarResults({ results: [{ title: "趋势 A", url: "https://example.com/a", score: 9, summary: "摘要" }] }), [{ rank: 1, title: "趋势 A", hotValue: "9", link: "https://example.com/a", detail: "摘要", cover: "" }]);
  assert.equal(normalizeTrendRadarResults({ data: [{ title: "趋势 B", url: "https://example.com/b" }] })[0].title, "趋势 B");
});

test("TrendRadar MCP 适配器完成 initialize、initialized、tools/call 握手", async () => {
  const previous = process.env.TRENDRADAR_MCP_URL;
  process.env.TRENDRADAR_MCP_URL = "http://127.0.0.1:3333/mcp";
  const calls: RequestInit[] = [];
  const responses = [
    new Response("event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n\n", { headers: { "mcp-session-id": "test-session" } }),
    new Response("", { status: 202 }),
    new Response("event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"{\\\"results\\\":[{\\\"title\\\":\\\"趋势 B\\\",\\\"url\\\":\\\"https://example.com/b\\\"}]}\"}]}}\n\n"),
  ];
  const items = await fetchTrendRadarHotspots("植发", { fetchFn: async (_input, init) => { calls.push(init || {}); return responses.shift() as Response; } });
  assert.equal(items[0].title, "趋势 B");
  assert.equal(calls.length, 3);
  assert.match(String(calls[2].body), /search_news/);
  if (previous === undefined) delete process.env.TRENDRADAR_MCP_URL; else process.env.TRENDRADAR_MCP_URL = previous;
});
