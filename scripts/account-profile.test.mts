import test from "node:test";
import assert from "node:assert/strict";
import { parseAccountProfile } from "../src/lib/account-profile.ts";

test("主页链接可识别平台和账号 ID", () => {
  assert.deepEqual(parseAccountProfile("https://www.douyin.com/user/abc123"), {
    platform: "douyin",
    externalId: "abc123",
    handle: "abc123",
    profileUrl: "https://www.douyin.com/user/abc123",
  });
  assert.equal(parseAccountProfile("https://www.xiaohongshu.com/user/profile/123456")?.externalId, "123456");
  assert.equal(parseAccountProfile("not-a-profile"), null);
});
