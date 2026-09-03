import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHotspots } from "../src/lib/daily-hotspots.ts";
import { normalizeSocaiHotspots } from "../src/lib/social-hotspots.ts";

test("兼容 60s API 的统一 data 响应", () => {
  assert.deepEqual(normalizeHotspots({ data: [{ title: "热点 A", hot_value: 123, link: "https://example.com" }] }), [{ rank: 1, title: "热点 A", hotValue: "123", link: "https://example.com", detail: "", cover: "" }]);
});

test("过滤无标题项目并限制三十条", () => {
  const rows = [{ title: "" }, ...Array.from({ length: 35 }, (_, index) => ({ word: `热点 ${index + 1}`, score: index }))];
  assert.equal(normalizeHotspots(rows).length, 30);
});

test("socai 小红书卡片映射为热点模型", () => {
  assert.deepEqual(normalizeSocaiHotspots("rednote", { cards: [{ title: "医美趋势", likes: "501", url: "https://www.xiaohongshu.com/explore/1", author: "作者" }] }), [{ rank: 1, title: "医美趋势", hotValue: "501", link: "https://www.xiaohongshu.com/explore/1", detail: "作者", cover: "" }]);
});
