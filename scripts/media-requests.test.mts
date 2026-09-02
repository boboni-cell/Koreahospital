import assert from "node:assert/strict";
import test from "node:test";
import db from "../src/lib/db.ts";
import {
  buildVideoSegmentPrompts,
  createMediaRequest,
  appendMediaRequestRound,
  updateMediaRequest,
  listMediaRequests,
  getMediaRequest,
} from "../src/lib/media-requests.ts";

test("15 秒以上视频按分镜时长拆段", () => {
  const { split, segments } = buildVideoSegmentPrompts({
    prompt: "发际线种植术后恢复快剪",
    storyboard: "镜头1 8秒 开场痛点\n镜头2 8秒 方案说明\n镜头3 8秒 效果展示",
    duration: 24,
    ratio: "9:16",
    style: "真实医疗纪实",
  });
  assert.equal(split, true);
  assert.ok(segments.length >= 2, "应拆成至少两段");
  assert.match(segments[0].prompt, /第 1 段/);
  assert.match(segments[0].prompt, /9:16/);
});

test("15 秒以内保持单段", () => {
  const { split, segments } = buildVideoSegmentPrompts({
    prompt: "短镜头",
    storyboard: "镜头1 5秒 开场",
    duration: 10,
  });
  assert.equal(split, false);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].label, "整段");
});

test("media_requests 创建/追加轮次/更新/列表 round-trip", () => {
  const created = createMediaRequest({
    projectId: 1,
    kind: "image",
    sourceLabel: "测试",
    prompt: "测试提示词",
    params: { ratio: "3:4", style: "真实" },
    round: { phase: "params_proposed", note: "首次提案" },
  });
  assert.ok(created.id > 0);
  assert.equal(created.status, "draft");
  assert.equal(created.rounds.length, 1);

  const withRound = appendMediaRequestRound(created.id, { phase: "params_confirmed", note: "用户确认" });
  assert.equal(withRound.rounds.length, 2);
  assert.equal(withRound.rounds[1].round, 2);

  const updated = updateMediaRequest(created.id, { status: "done", assetIds: [7, 8] });
  assert.equal(updated.status, "done");
  assert.deepEqual(updated.asset_ids, [7, 8]);

  const listed = listMediaRequests(1);
  assert.ok(listed.some((m) => m.id === created.id));

  // 清理
  db.prepare("DELETE FROM media_requests WHERE id=?").run(created.id);
  assert.equal(getMediaRequest(created.id), null);
});
