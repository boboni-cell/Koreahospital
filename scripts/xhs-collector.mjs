import Database from "better-sqlite3";

const args = Object.fromEntries(process.argv.slice(2).reduce((all, value, i, arr) => {
  if (value.startsWith("--")) all.push([value.slice(2), arr[i + 1] || ""]);
  return all;
}, []));
const taskId = Number(args["task-id"]);
const keywords = args.keywords || "";
const db = new Database("data/clinic.db");
const update = db.prepare("UPDATE research_tasks SET status=?, progress=?, total=?, error=?, started_at=COALESCE(started_at, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP WHERE id=?");
const fail = (message) => { update.run("failed", 0, 0, message.slice(0, 500), taskId); db.close(); process.exit(1); };

if (process.env.KOREAHOSPITAL_READ_ONLY !== "1") fail("只读采集器未启用");
update.run("running", 0, 0, null, taskId);

async function getTarget() {
  const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
  return targets.find((t) => t.type === "page" && /xiaohongshu\.com/i.test(t.url)) || targets.find((t) => t.type === "page");
}
function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timer = setTimeout(() => { ws.close(); reject(new Error("Chrome 页面读取超时")); }, 10000);
    ws.onopen = () => ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
    ws.onmessage = (event) => { const data = JSON.parse(event.data); if (data.id !== id) return; clearTimeout(timer); ws.close(); if (data.error) reject(new Error(data.error.message)); else resolve(data.result?.result?.value); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("无法连接 Chrome 调试端口")); };
  });
}

try {
  const target = await getTarget();
  if (!target?.webSocketDebuggerUrl) fail("没有找到已打开的小红书页面。请先启动只读 Chrome 并手动登录。");
  const page = await evaluate(target.webSocketDebuggerUrl, `(() => ({
    url: location.href,
    title: document.title,
    text: document.body?.innerText?.slice(0, 12000) || "",
    links: [...document.querySelectorAll('a[href]')].map(a => ({ href: a.href, text: (a.innerText || a.textContent || "").trim() })).filter(x => x.text || /\\/(explore|discovery\\/item)\\//.test(x.href)).slice(0, 100)
  }))()`);
  const rows = (page.links || []).filter((item) => /xiaohongshu\.com/i.test(item.href) && /\/(explore|discovery\/item)\//.test(item.href) && item.text).slice(0, 50);
  if (!rows.length) fail("已连接小红书页面，但没有识别到笔记列表。请打开创作者后台的笔记列表页后重试。");
  const insert = db.prepare(`INSERT OR IGNORE INTO research_items (task_id, project_id, platform, external_id, source_url, title, raw_json) SELECT ?, project_id, 'xiaohongshu', ?, ?, ?, ? FROM research_tasks WHERE id=?`);
  const run = db.transaction(() => rows.forEach((row) => insert.run(taskId, row.href.split("/").pop(), row.href, row.text.slice(0, 300), JSON.stringify({ keywords, page: page.url, text: page.text }))));
  run();
  update.run("completed", rows.length, rows.length, null, taskId);
  db.prepare("UPDATE research_tasks SET completed_at=CURRENT_TIMESTAMP WHERE id=?").run(taskId);
  db.close();
} catch (error) {
  fail(error?.message || String(error));
}
