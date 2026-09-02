import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { startXhsCollection } from "@/lib/xhs-collector";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.prepare("SELECT * FROM research_tasks WHERE project_id=? ORDER BY id DESC LIMIT 20").all(getCurrentProjectId());
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const keywords = String(body.keywords || "").trim();
  if (!keywords) return NextResponse.json({ error: "请输入采集关键词" }, { status: 400 });
  const projectId = getCurrentProjectId();
  const info = db.prepare("INSERT INTO research_tasks (project_id, platform, keywords) VALUES (?, 'xiaohongshu', ?)").run(projectId, keywords.slice(0, 200));
  const taskId = Number(info.lastInsertRowid);
  const pid = startXhsCollection(taskId, keywords.slice(0, 200));
  return NextResponse.json({ ok: true, taskId, workerPid: pid, readOnly: true });
}
