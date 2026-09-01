import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pid = getCurrentProjectId();
  const status = req.nextUrl.searchParams.get("status");
  if (status) {
    const rows = db.prepare("SELECT s.*, src.name AS source_name FROM signals s LEFT JOIN signal_sources src ON src.id=s.source_id WHERE s.project_id=? AND s.status=? ORDER BY s.id DESC").all(pid, status);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT s.*, src.name AS source_name FROM signals s LEFT JOIN signal_sources src ON src.id=s.source_id WHERE s.project_id=? ORDER BY s.id DESC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare("INSERT INTO signals (project_id, platform, source_url, title, evidence, source_id, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')")
    .run(pid, b.platform ?? null, b.source_url ?? null, b.title ?? "", b.evidence ?? null, Number(b.source_id) || null);
  recordAction({
    objectType: "signal",
    objectId: Number(info.lastInsertRowid),
    action: "signal.create",
    detail: `新增信号 ${b.title ?? ""}（${b.platform ?? "-"}）`,
  });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const status = b.status ?? "pending";
  const op = db.prepare("SELECT id FROM operators ORDER BY id ASC LIMIT 1").get() as { id: number } | undefined;
  db.prepare("UPDATE signals SET status=?, confirmed_by=? WHERE id=?").run(status, op?.id ?? null, id);
  recordAction({
    objectType: "signal",
    objectId: id,
    action: "signal." + status,
    detail: `信号 #${id} 状态 → ${status}`,
  });
  return NextResponse.json({ ok: true, id });
}

export function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("DELETE FROM signals WHERE id=?").run(id);
  recordAction({ objectType: "signal", objectId: Number(id), action: "signal.delete", detail: `删除信号 #${id}` });
  return NextResponse.json({ ok: true, id });
}
