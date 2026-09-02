import test from "node:test";
import assert from "node:assert/strict";
import { detectPostMapping, median, metricRate, parseTags, postExternalId } from "../src/lib/post-analytics.ts";

test("official export headers map to post analytics fields", () => {
  const mapping = detectPostMapping(["作品ID", "标题", "发布时间", "阅读量", "点赞", "收藏", "评论", "分享", "新增粉丝"]);
  assert.equal(mapping.external_post_id, 0);
  assert.equal(mapping.published_at, 2);
  assert.equal(mapping.views, 3);
  assert.equal(mapping.follower_gain, 8);
});

test("rates and medians keep missing follower attribution explicit", () => {
  assert.equal(metricRate(180, 2000), 9);
  assert.equal(metricRate(null, 2000), null);
  assert.equal(median([2, null, 8, 4]), 4);
});

test("tags prefer explicit hashtags and derived ids stay stable", () => {
  assert.deepEqual(parseTags("#植发 #科普", "正文 #历史"), ["植发", "科普"]);
  assert.equal(postExternalId("xiaohongshu", "", "", "标题", "2026-08-25"), postExternalId("xiaohongshu", "", "", "标题", "2026-08-25"));
});
