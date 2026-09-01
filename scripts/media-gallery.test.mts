import test from "node:test";
import assert from "node:assert/strict";
import { parseMediaUrls } from "../src/lib/media.ts";

test("parseMediaUrls returns [] on empty / null / malformed", () => {
  assert.deepEqual(parseMediaUrls(null), []);
  assert.deepEqual(parseMediaUrls(undefined), []);
  assert.deepEqual(parseMediaUrls(""), []);
  assert.deepEqual(parseMediaUrls("not-json"), []);
  assert.deepEqual(parseMediaUrls("{}"), []); // 顶层不是数组
});

test("parseMediaUrls keeps only items with type image|video", () => {
  const input = JSON.stringify([
    { type: "image", url: "https://x/a.jpg" },
    { type: "video", url: "https://x/b.mp4" },
    { type: "audio", url: "https://x/c.mp3" }, // 应被过滤
    { url: "https://x/d.jpg" }, // 缺 type
    null,
    "garbage",
  ]);
  const out = parseMediaUrls(input);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { type: "image", url: "https://x/a.jpg" });
  assert.deepEqual(out[1], { type: "video", url: "https://x/b.mp4" });
});

test("parseMediaUrls round-trips through JSON.stringify", () => {
  const arr = [
    { type: "image" as const, url: "https://x/y.png" },
    { type: "video" as const, url: "https://x/z.webm" },
  ];
  const round = parseMediaUrls(JSON.stringify(arr));
  assert.deepEqual(round, arr);
});