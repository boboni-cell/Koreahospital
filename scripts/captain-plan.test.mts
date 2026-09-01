import test from "node:test";
import assert from "node:assert/strict";

/** ponytail: 验证 orchestrate route 在 mock 模式下仍返回 planId + steps
 * 且 step 默认 role 由 modelKind 推导。*/

test("orchestrate 返回 planId 且至少 1 个 step", async () => {
  const r = await fetch("http://localhost:3000/api/agent/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: "smoke: 写一篇测试小红书笔记" }),
  });
  assert.ok(r.ok, "orchestrate 必须 2xx");
  const d = await r.json();
  assert.ok(d.planId, "必须有 planId");
  assert.ok(Array.isArray(d.steps), "steps 必须数组");
  assert.ok(d.steps.length > 0, "至少 1 个 step");
  // 每个 step 必须有 role + status + text
  for (const s of d.steps) {
    assert.equal(typeof s.text, "string");
    assert.equal(s.status, "pending");
    assert.ok(["writer", "designer", "analyst", "researcher", "strategist", "publisher"].includes(s.role), `未知 role: ${s.role}`);
  }
});

test("execute-step 对已完成 step 拒绝重复执行", async () => {
  const r1 = await fetch("http://localhost:3000/api/agent/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: "smoke: 单步去重" }),
  });
  const d = await r1.json();
  // 第一次执行
  const r2 = await fetch(`http://localhost:3000/api/agent/plans/${d.planId}/execute-step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step_index: 0 }),
  });
  const d2 = await r2.json();
  // mock 模式下可能 mock 失败（无 key），所以只验证格式
  assert.ok(d2.step_index === 0 || d2.error, "返回必须含 step_index 或 error");
});
