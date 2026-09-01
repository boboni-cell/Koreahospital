/**
 * 每日日志 + 自动压缩。结构与限制参数完全对齐 dsh 的 dsh-auto-memory：
 *   - summaries/{YYYY-MM-DD}-昨天.json = { summary, works: [{title, points[]}] }
 *   - MEMORY.md = 长期记忆（手动/脚本追加）
 *   - injectBudgetChars=5000, recentDaysInjected=1, dayBoundaryMinutes=450
 *
 * 区别：不调 LLM 摘要，纯字符串模板分桶（保留信息 + 零成本）。
 * ponytail: 压缩是同步纯字符串处理；多写作并发由 OS 文件锁兜底（O_APPEND atomic）。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data");
const LOGS_DIR = path.join(ROOT, "logs");
const SUM_DIR = path.join(ROOT, "summaries");
const MEMORY_PATH = path.join(ROOT, "MEMORY.md");

export const INJECT_BUDGET_CHARS = 5000;
export const RECENT_DAYS_INJECTED = 1;

export type LogEntry =
  | { t: string; kind: "user_msg"; text: string; page?: string }
  | { t: string; kind: "agent_msg"; role: string; text: string; page?: string }
  | { t: string; kind: "write"; table: string; id?: number; fields: Record<string, unknown>; by: "user" | "agent" }
  | { t: string; kind: "tool"; name: string; ok: boolean; detail?: string };

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function ensureDirs() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.mkdirSync(SUM_DIR, { recursive: true });
}

type AppendInput =
  | { kind: "user_msg"; text: string; page?: string }
  | { kind: "agent_msg"; role: string; text: string; page?: string }
  | { kind: "write"; table: string; id?: number; fields: Record<string, unknown>; by: "user" | "agent" }
  | { kind: "tool"; name: string; ok: boolean; detail?: string };

/** 追加一行今日日志（同步；O_APPEND 保证原子写）。 */
export function append(entry: AppendInput): void {
  ensureDirs();
  const line = JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(path.join(LOGS_DIR, `${todayKey()}.jsonl`), line, { encoding: "utf-8" });
}

/** 读今日全部日志（供浮窗上下文 / 手动调试）。 */
export function readToday(): LogEntry[] {
  ensureDirs();
  const f = path.join(LOGS_DIR, `${todayKey()}.jsonl`);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l) as LogEntry; } catch { return null; }
  }).filter((x): x is LogEntry => !!x);
}

/** 读指定日全部日志。 */
export function readDay(yyyymmdd: string): LogEntry[] {
  const f = path.join(LOGS_DIR, `${yyyymmdd}.jsonl`);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l) as LogEntry; } catch { return null; }
  }).filter((x): x is LogEntry => !!x);
}

/** 纯字符串压缩：分桶统计 + 一句散文。 */
export function compress(entries: LogEntry[], dayLabel: string) {
  const buckets = new Map<string, { title: string; count: number; samples: string[] }>();
  const push = (title: string, sample: string) => {
    const b = buckets.get(title) ?? { title, count: 0, samples: [] };
    b.count++;
    if (b.samples.length < 3 && sample) b.samples.push(sample.slice(0, 60));
    buckets.set(title, b);
  };
  for (const e of entries) {
    if (e.kind === "user_msg") push("用户对话", e.text);
    else if (e.kind === "agent_msg") push(`Agent 回应 (${e.role})`, e.text);
    else if (e.kind === "write") push(`写入 ${e.table}`, Object.keys(e.fields).join(","));
    else if (e.kind === "tool") push(`工具 ${e.name}${e.ok ? "" : " 失败"}`, e.detail ?? "");
  }
  const works = [...buckets.values()].map((b) => ({
    title: `${b.title} × ${b.count}`,
    points: b.samples.length ? b.samples : [`本日 ${b.count} 次操作`],
  }));
  const total = entries.length;
  const summary = `${dayLabel} 共 ${total} 条操作：` +
    [...buckets.entries()].slice(0, 4).map(([k, v]) => `${k.replace(/×.*/, "")} ${v.count}`).join("、") + "。";
  return { summary, works };
}

/** 把指定日折叠成 summaries/{YYYY-MM-DD}-昨天.json。idempotent。 */
export function compressDay(yyyymmdd: string): { summary: string; works: { title: string; points: string[] }[] } | null {
  ensureDirs();
  const entries = readDay(yyyymmdd);
  if (entries.length === 0) return null;
  const result = compress(entries, yyyymmdd);
  fs.writeFileSync(path.join(SUM_DIR, `${yyyymmdd}-昨天.json`), JSON.stringify(result, null, 2), "utf-8");
  // 压缩完把原始日志清掉（jsonl 一行行删成本高，直接 unlink，备份交给 git）
  fs.unlinkSync(path.join(LOGS_DIR, `${yyyymmdd}.jsonl`));
  return result;
}

/** 给 LLM 注入的上下文：今日完整日志 + 昨日摘要 + MEMORY.md 摘要，预算 ≤5000 字符。 */
export function loadContext(): string {
  ensureDirs();
  const parts: string[] = [];
  // 1. 今日日志（最相关）
  const today = readToday();
  if (today.length) {
    parts.push(`【今日 ${todayKey()} 共 ${today.length} 条】`);
    for (const e of today.slice(-30)) { // 只取最近 30 条
      if (e.kind === "user_msg") parts.push(`用户: ${e.text}`);
      else if (e.kind === "agent_msg") parts.push(`${e.role}: ${e.text}`);
      else if (e.kind === "write") parts.push(`写入 ${e.table}: ${Object.keys(e.fields).join(",")}`);
      else if (e.kind === "tool") parts.push(`${e.name}${e.ok ? " ok" : " fail"}: ${e.detail ?? ""}`);
    }
  }
  // 2. 昨日摘要（一个文件）
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yKey = todayKey(y);
  const yf = path.join(SUM_DIR, `${yKey}-昨天.json`);
  if (fs.existsSync(yf)) {
    const sum = JSON.parse(fs.readFileSync(yf, "utf-8")) as { summary: string; works: { title: string; points: string[] }[] };
    parts.push(`\n【昨日摘要 ${yKey}】${sum.summary}`);
    for (const w of sum.works) parts.push(`- ${w.title}: ${w.points.join("；")}`);
  }
  // 3. 长期 MEMORY.md（裁到预算内）
  if (fs.existsSync(MEMORY_PATH)) {
    const mem = fs.readFileSync(MEMORY_PATH, "utf-8");
    parts.push(`\n【长期记忆】\n${mem.trim()}`);
  }
  // 截断到预算
  const joined = parts.join("\n");
  return joined.length > INJECT_BUDGET_CHARS ? joined.slice(-INJECT_BUDGET_CHARS) : joined;
}

/** CLI 自检：`node --experimental-strip-types scripts/daily-compact.ts [YYYY-MM-DD] [append]` */
if (process.argv[1]?.endsWith("daily-log.ts")) {
  const cmd = process.argv[2];
  if (cmd === "context") {
    console.log(loadContext());
  } else if (cmd === "today") {
    console.log(JSON.stringify(readToday(), null, 2));
  } else {
    console.log("用法: daily-log context|today");
  }
}