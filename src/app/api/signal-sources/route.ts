import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const projectId = getCurrentProjectId();
  return NextResponse.json(db.prepare(`SELECT src.*, COUNT(s.id) AS signals_count FROM signal_sources src LEFT JOIN signals s ON s.source_id=src.id WHERE src.project_id=? GROUP BY src.id ORDER BY src.id DESC`).all(projectId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const projectId = getCurrentProjectId();
  if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "请填写来源名称" }, { status: 400 });
  const info = db.prepare(`INSERT INTO signal_sources (project_id, name, kind, platform, url, keywords, category, credibility, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
    .run(projectId, String(body.name).trim(), body.kind ?? "competitor", body.platform ?? null, body.url ?? null, body.keywords ?? null, body.category ?? "竞品账号", body.credibility ?? "medium");
  recordAction({ objectType: "signal_source", objectId: Number(info.lastInsertRowid), action: "source.create", detail: `新增信息源 ${body.name}` });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const body = await req.json(); const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  if (body.action === "checked") db.prepare("UPDATE signal_sources SET last_checked_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
  else db.prepare("UPDATE signal_sources SET status=? WHERE id=?").run(body.status === "paused" ? "paused" : "active", id);
  return NextResponse.json({ ok: true, id });
}

export function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("UPDATE signals SET source_id=NULL WHERE source_id=?").run(id);
  db.prepare("DELETE FROM signal_sources WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id });
}
