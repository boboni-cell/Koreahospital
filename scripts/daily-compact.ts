#!/usr/bin/env -S npx tsx
/**
 * 手动 / cron 触发昨日日志压缩。
 * 用法：
 *   npx tsx scripts/daily-compact.ts                # 压缩昨天
 *   npx tsx scripts/daily-compact.ts 2026-09-01     # 压缩指定日
 *   npx tsx scripts/daily-compact.ts --check        # 跑自检
 */
import { compressDay, append, loadContext, readToday } from "../src/lib/daily-log";

const arg = process.argv[2];

if (arg === "--check") {
  append({ kind: "user_msg", text: "[self-check] daily-log 自检" });
  append({ kind: "agent_msg", role: "strategist", text: "echo ok" });
  append({ kind: "write", table: "accounts", fields: { handle: "test" }, by: "user" });
  const today = readToday();
  console.log(`✅ today entries: ${today.length}`);
  const ctx = loadContext();
  console.log(`✅ loadContext chars: ${ctx.length} (预算 5000)`);
  console.log(ctx.slice(0, 400));
  process.exit(0);
}

const day = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : (() => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const r = compressDay(day);
console.log(r ? `✅ 压缩 ${day}: ${r.summary}` : `ℹ️  ${day} 无日志`);