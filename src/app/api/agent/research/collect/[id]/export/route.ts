import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function filename(value: string) {
  return value.replace(/[^\w\u4e00-\u9fff-]+/g, "-").slice(0, 60) || "小红书采集";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = Number(id);
  const format = req.nextUrl.searchParams.get("format") || "json";
  const task = db.prepare("SELECT * FROM research_tasks WHERE id=? AND project_id=?").get(taskId, getCurrentProjectId()) as any;
  if (!task) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });
  const items = db.prepare("SELECT * FROM research_items WHERE task_id=? ORDER BY id").all(taskId) as any[];
  const base = filename(`小红书-${task.keywords || "采集"}-${taskId}`);

  if (format === "json") {
    return new NextResponse(JSON.stringify({ task, items }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.json"` },
    });
  }

  if (format === "md" || format === "markdown") {
    const lines = [`# 小红书采集结果`, ``, `- 关键词：${task.keywords || ""}`, `- 状态：${task.status}`, `- 采集时间：${task.completed_at || task.updated_at || task.created_at}`, `- 内容数量：${items.length}`, ``];
    items.forEach((item, index) => {
      lines.push(`## ${index + 1}. ${item.title || "未命名帖子"}`, ``, `- 作者：${item.author || "未知"}`, `- 发布时间：${item.published_at || "未知"}`, `- 点赞：${item.likes ?? ""}｜收藏：${item.saves ?? ""}｜评论：${item.comments ?? ""}`, `- 来源：${item.source_url || ""}`, ``);
      let raw: any = null;
      try { raw = item.raw_json ? JSON.parse(item.raw_json) : null; } catch { raw = null; }
      const note = raw?.note;
      if (note?.content) lines.push(note.content, ``);
    });
    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.md"` },
    });
  }

  if (format === "csv") {
    const csv = toCsv(["标题", "作者", "发布时间", "点赞", "收藏", "评论", "来源链接"], items.map((item) => [item.title || "", item.author || "", item.published_at || "", item.likes ?? "", item.saves ?? "", item.comments ?? "", item.source_url || ""]));
    return new NextResponse("\ufeff" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"` },
    });
  }

  return NextResponse.json({ error: "不支持的导出格式" }, { status: 400 });
}
