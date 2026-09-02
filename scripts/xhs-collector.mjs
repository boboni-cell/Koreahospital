import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";

const args = Object.fromEntries(process.argv.slice(2).reduce((all, value, i, arr) => {
  if (value.startsWith("--")) all.push([value.slice(2), arr[i + 1] || ""]);
  return all;
}, []));
const taskId = Number(args["task-id"]);
const keywords = String(args.keywords || "").trim();
const db = new Database("data/clinic.db");
const update = db.prepare("UPDATE research_tasks SET status=?, progress=?, total=?, error=?, started_at=COALESCE(started_at, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP WHERE id=?");
const fail = (message) => { update.run("failed", 0, 0, message.slice(0, 500), taskId); db.close(); process.exit(1); };

if (process.env.KOREAHOSPITAL_READ_ONLY !== "1") fail("只读采集器未启用");
if (!keywords) fail("缺少小红书搜索关键词");
update.run("running", 0, 0, null, taskId);

function findSocai() {
  return process.env.SOCAI_BIN || [
    "/Users/zhanghanyue/.socai/bin/socai",
    `${process.env.HOME || ""}/.socai/bin/socai`,
    "socai",
  ].find((candidate) => candidate === "socai" || existsSync(candidate));
}

function runSocai(binary) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ["xhs", "search", keywords, "--filter", "sort=最多点赞", "--filter", "publish_time=一周内", "--num-notes", "50", "--num-comments", "8", "--pretty"], {
      cwd: process.cwd(),
      env: { ...process.env, SOCAI_RUNS_DIR: `${process.cwd()}/data/socai-runs` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("socai 小红书采集超时（2分钟）")); }, 120000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `socai 退出码 ${code}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error(`socai 返回的不是有效 JSON${stderr ? `：${stderr.trim().slice(0, 300)}` : ""}`)); }
    });
  });
}

function asText(value) { return value == null ? "" : String(value); }
function asCount(value) {
  const raw = asText(value).replace(/,/g, "").trim();
  const match = raw.match(/([\d.]+)\s*([万千百kKmM])?/);
  if (!match) return null;
  const factor = { 万: 10000, 千: 1000, 百: 100, k: 1000, m: 1000000 }[String(match[2] || "").toLowerCase()] || 1;
  return Math.round(Number(match[1]) * factor) || null;
}
function flattenNotes(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => flattenNotes(item, found));
  else if (value && typeof value === "object") {
    if (value.note_id || value.noteId || value.note_url) { found.push(value); return; }
    Object.values(value).forEach((item) => flattenNotes(item, found));
  }
  return found;
}

try {
  const binary = findSocai();
  if (!binary) fail("没有找到 socai CLI。请确认已安装，或设置 SOCAI_BIN 环境变量。");
  const result = await runSocai(binary);
  const notes = flattenNotes(result).filter((note, index, all) => {
    const id = asText(note.note_id || note.noteId || note.id || note.url || note.note_url);
    return id && all.findIndex((item) => asText(item.note_id || item.noteId || item.id || item.url || item.note_url) === id) === index;
  }).slice(0, 50);
  if (!notes.length) fail("socai 已执行，但没有返回可保存的小红书帖子。");

  const insert = db.prepare(`INSERT OR IGNORE INTO research_items
    (task_id, project_id, platform, external_id, source_url, title, author, published_at, likes, saves, comments, raw_json)
    SELECT ?, project_id, 'xiaohongshu', ?, ?, ?, ?, ?, ?, ?, ?, ? FROM research_tasks WHERE id=?`);
  const run = db.transaction(() => notes.forEach((note) => {
    const url = asText(note.url || note.note_url || note.source_url);
    const externalId = asText(note.note_id || note.noteId || note.id || url.split("/").pop());
    insert.run(taskId, externalId, url, asText(note.title || note.name).slice(0, 300),
      asText(note.author || note.author_name || note.user?.nickname).slice(0, 200),
      asText(note.date || note.published_at || note.publish_time).slice(0, 80),
      asCount(note.likes || note.like_count), asCount(note.favorites || note.favorite_count || note.collect_count),
      asCount(note.comments_count || note.comments || note.comment_count), JSON.stringify({ keywords, source: "socai", note }), taskId);
  }));
  run();
  update.run("completed", notes.length, notes.length, null, taskId);
  db.prepare("UPDATE research_tasks SET completed_at=CURRENT_TIMESTAMP WHERE id=?").run(taskId);
  db.close();
} catch (error) { fail(error?.message || String(error)); }
