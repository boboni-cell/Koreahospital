import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHotspots } from "../src/lib/daily-hotspots.ts";

test("兼容 60s API 的统一 data 响应", () => {
  assert.deepEqual(normalizeHotspots({ data: [{ title: "热点 A", hot_value: 123, link: "https://example.com" }] }), [{ rank: 1, title: "热点 A", hotValue: "123", link: "https://example.com", detail: "", cover: "" }]);
});

test("过滤无标题项目并限制三十条", () => {
  const rows = [{ title: "" }, ...Array.from({ length: 35 }, (_, index) => ({ word: `热点 ${index + 1}`, score: index }))];
  assert.equal(normalizeHotspots(rows).length, 30);
});
