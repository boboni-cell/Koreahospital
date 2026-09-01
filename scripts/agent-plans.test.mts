import test from "node:test";
import assert from "node:assert/strict";
import db from "../src/lib/db.ts";

/** ponytail: 验证 db.ts 的幂等性——多次 import 同一个 db 实例 + agent_plans 表存在 + INSERT/SELECT round-trip。
 * 直接跑会真写 sqlite,测试结束后清掉自己写的行。 */

test("agent_plans 表已存在", () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_plans'").get() as { name: string } | undefined;
  assert.ok(row, "agent_plans 表不存在");
});

test("agent_plans INSERT/SELECT round-trip + status 字段更新", () => {
  const info = db.prepare(
    "INSERT INTO agent_plans (project_id, task, steps_json, note, status) VALUES (?, ?, ?, ?, ?)"
  ).run(1, "smoke test plan", JSON.stringify([{ text: "step1", status: "pending" }]), "note", "pending");
  const id = Number(info.lastInsertRowid);
  assert.ok(id > 0);

  const row = db.prepare("SELECT * FROM agent_plans WHERE id=?").get(id) as any;
  assert.equal(row.task, "smoke test plan");
  assert.equal(row.status, "pending");
  assert.equal(JSON.parse(row.steps_json)[0].text, "step1");

  db.prepare("UPDATE agent_plans SET status=? WHERE id=?").run("completed", id);
  const updated = db.prepare("SELECT status FROM agent_plans WHERE id=?").get(id) as any;
  assert.equal(updated.status, "completed");

  db.prepare("DELETE FROM agent_plans WHERE id=?").run(id);
  const after = db.prepare("SELECT id FROM agent_plans WHERE id=?").get(id);
  assert.equal(after, undefined);
});