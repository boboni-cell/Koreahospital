import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db.prepare("SELECT * FROM content_pillars WHERE project_id=? ORDER BY id ASC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare("INSERT INTO content_pillars (project_id, name, description) VALUES (?, ?, ?)")
    .run(pid, b.name ?? "", b.description ?? null);
  recordAction({
    objectType: "content_pillar",
    objectId: Number(info.lastInsertRowid),
    action: "content_pillar.create",
    detail: `新增内容支柱 ${b.name ?? ""}`,
  });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("DELETE FROM account_pillars WHERE pillar_id=?").run(id);
  db.prepare("DELETE FROM content_pillars WHERE id=?").run(id);
  recordAction({ objectType: "content_pillar", objectId: Number(id), action: "content_pillar.delete", detail: `删除内容支柱 #${id}` });
  return NextResponse.json({ ok: true, id });
}
