import test from "node:test";
import assert from "node:assert/strict";

const { injectSkillsForTask } = await import("../src/lib/skills.ts");

test("injectSkillsForTask 给一个简单文案任务返非空字符串", async () => {
  const out = await injectSkillsForTask("写一篇小红书植发笔记", { platform: "xiaohongshu", role: "director" }, ["medical-compliance"]);
  assert.equal(typeof out, "string");
  assert.ok(out.length > 0, "应该至少有 medical-compliance 内容");
});

test("injectSkillsForTask 失败时降级空字符串", async () => {
  const out = await injectSkillsForTask("", {}, []);
  assert.equal(typeof out, "string");
});
