import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

const KINDS = ["competitor", "structure", "cta", "comment"];

export async function GET(req: NextRequest) {
  const pid = getCurrentProjectId();
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind && KINDS.includes(kind)) {
    const rows = db.prepare("SELECT * FROM knowledge_items WHERE project_id=? AND kind=? ORDER BY id DESC").all(pid, kind);
    return NextResponse.json(rows);
  }
  const rows = db.prepare("SELECT * FROM knowledge_items WHERE project_id=? ORDER BY id DESC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const kind = b.kind && KINDS.includes(b.kind) ? b.kind : "structure";
  const info = db
    .prepare("INSERT INTO knowledge_items (project_id, kind, platform, title, content, evidence, source_signal_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')")
    .run(pid, kind, b.platform ?? null, b.title ?? "", b.content ?? null, b.evidence ?? null, b.source_signal_id ?? null);
  recordAction({ objectType: "knowledge", objectId: Number(info.lastInsertRowid), action: "knowledge.create", detail: `新增知识条目 [${kind}] ${b.title ?? ""}` });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("UPDATE knowledge_items SET status=? WHERE id=?").run(b.status ?? "active", id);
  recordAction({ objectType: "knowledge", objectId: id, action: "knowledge.update", detail: `知识条目 #${id} 状态→${b.status ?? "active"}` });
  return NextResponse.json({ ok: true, id });
}

export function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("DELETE FROM knowledge_items WHERE id=?").run(id);
  recordAction({ objectType: "knowledge", objectId: Number(id), action: "knowledge.delete", detail: `删除知识条目 #${id}` });
  return NextResponse.json({ ok: true, id });
}
