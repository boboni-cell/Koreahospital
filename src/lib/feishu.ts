import { spawn } from "node:child_process";

type Json = Record<string, any>;

function cliPath() {
  return process.env.LARK_CLI_BIN || "/Users/zhanghanyue/.local/bin/lark-cli";
}

function run(args: string[], input?: string): Promise<Json> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath(), args, { cwd: process.cwd(), env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("飞书 CLI 操作超时")); }, 120000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `飞书 CLI 退出码 ${code}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error("飞书 CLI 返回的不是有效 JSON")); }
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function findKey(value: any, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  for (const key of keys) if (typeof value[key] === "string" && value[key]) return value[key];
  for (const item of Object.values(value)) {
    const found = findKey(item, keys);
    if (found) return found;
  }
  return null;
}

export async function createFeishuDoc(title: string, markdown: string) {
  const result = await run(["docs", "+create", "--as", "user", "--doc-format", "markdown", "--title", title, "--content", "-"] , markdown);
  const url = findKey(result, ["url"]);
  const documentId = findKey(result, ["document_id", "documentId"]);
  if (!url && !documentId) throw new Error("飞书文档已请求创建，但没有返回文档地址");
  return { url, documentId, raw: result };
}

const BASE_FIELDS = [
  { type: "text", name: "标题" },
  { type: "text", name: "作者" },
  { type: "text", name: "发布时间" },
  { type: "number", name: "点赞" },
  { type: "number", name: "收藏" },
  { type: "number", name: "评论" },
  { type: "text", name: "来源链接", style: { type: "url" } },
  { type: "text", name: "采集任务" },
];

export async function createFeishuBase() {
  const result = await run(["base", "+base-create", "--as", "user", "--name", "韩国医院小红书研究数据", "--table-name", "帖子数据", "--fields", JSON.stringify(BASE_FIELDS)]);
  const baseToken = findKey(result, ["base_token", "baseToken"]);
  if (!baseToken) throw new Error("飞书多维表格已请求创建，但没有返回 Base Token");
  const tables = await run(["base", "+table-list", "--as", "user", "--base-token", baseToken]);
  const tableId = findKey(tables, ["table_id", "tableId", "id"]);
  if (!tableId) throw new Error("飞书多维表格已创建，但没有找到数据表");
  return { baseToken, tableId, raw: result };
}

export async function createFeishuRecords(baseToken: string, tableId: string, records: Json[]) {
  for (let i = 0; i < records.length; i += 200) {
    const args = ["base", "+record-batch-create", "--as", "user", "--base-token", baseToken, "--table-id", tableId, "--json", JSON.stringify({ create_records: records.slice(i, i + 200) })];
    // ponytail: 仅对建表后的短暂 NOTEXIST 重试 3 次，持久资源错误仍直接抛出。
    for (let attempt = 0; ; attempt++) {
      try {
        await run(args);
        break;
      } catch (error) {
        const message = String((error as Error)?.message || error);
        if (attempt >= 2 || !message.includes("NOTEXIST")) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

export async function createFeishuReport(title: string, report: { diagnosis: string; evidence: string; actions: string[]; periodStart: string; periodEnd: string }, rows: Json[]) {
  const lines = [`# ${title}`, ``, `- 周期：${report.periodStart} 至 ${report.periodEnd}`, ``, `## 结论`, ``, report.diagnosis, ``, `## 证据`, ``, report.evidence, ``, `## 下一步动作`, ``];
  report.actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  lines.push(``, `## 帖子数据`, ``, `| 标题 | 平台 | 账号 | 浏览 | 互动率 | 分享率 |`, `|---|---|---|---:|---:|---:|`);
  rows.forEach((row) => lines.push(`| ${String(row.title || "").replace(/\|/g, "\\|")} | ${row.platform || ""} | ${row.handle || ""} | ${row.views ?? 0} | ${row.engagement_rate ?? ""} | ${row.share_rate ?? ""} |`));
  return createFeishuDoc(title, lines.join("\n"));
}
