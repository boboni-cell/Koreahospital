import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { createFeishuBase, createFeishuDoc, createFeishuRecords } from "@/lib/feishu";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const taskId = Number((await params).id);
  const projectId = getCurrentProjectId();
  const task = db.prepare("SELECT * FROM research_tasks WHERE id=? AND project_id=?").get(taskId, projectId) as any;
  if (!task) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });
  if (task.status !== "completed") return NextResponse.json({ error: "采集任务尚未完成，暂不能同步" }, { status: 409 });
  const items = db.prepare("SELECT * FROM research_items WHERE task_id=? ORDER BY id").all(taskId) as any[];
  try {
    const markdown = [`# 小红书研究报告`, ``, `- 关键词：${task.keywords || ""}`, `- 采集任务：#${task.id}`, `- 内容数量：${items.length}`, `- 采集时间：${task.completed_at || task.updated_at || task.created_at}`, ``];
    items.forEach((item, index) => markdown.push(`## ${index + 1}. ${item.title || "未命名帖子"}`, ``, `- 作者：${item.author || "未知"}`, `- 发布时间：${item.published_at || "未知"}`, `- 点赞：${item.likes ?? ""}｜收藏：${item.saves ?? ""}｜评论：${item.comments ?? ""}`, `- 来源：${item.source_url || ""}`, ``));
    const doc = await createFeishuDoc(`小红书研究报告-${task.keywords || task.id}`, markdown.join("\n"));
    let integration = db.prepare("SELECT * FROM feishu_integrations WHERE project_id=?").get(projectId) as any;
    if (!integration?.base_token || !integration?.table_id) {
      const base = await createFeishuBase();
      db.prepare("INSERT INTO feishu_integrations (project_id, base_token, table_id) VALUES (?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET base_token=excluded.base_token, table_id=excluded.table_id, updated_at=CURRENT_TIMESTAMP").run(projectId, base.baseToken, base.tableId);
      integration = base;
    }
    await createFeishuRecords(integration.base_token, integration.table_id, items.map((item) => ({
      "标题": item.title || "",
      "作者": item.author || "",
      "发布时间": item.published_at || "",
      "点赞": item.likes ?? 0,
      "收藏": item.saves ?? 0,
      "评论": item.comments ?? 0,
      "来源链接": item.source_url || "",
      "采集任务": `#${task.id}`,
    })));
    return NextResponse.json({ ok: true, docUrl: doc.url, baseToken: integration.base_token, tableId: integration.table_id, count: items.length });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 502 });
  }
}
