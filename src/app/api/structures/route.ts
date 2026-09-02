import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db.prepare("SELECT * FROM structures WHERE (project_id=? OR project_id IS NULL) AND status='active' ORDER BY id DESC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.platform || !b.structure) return NextResponse.json({ error: "缺 platform/structure" }, { status: 400 });
  const pid = getCurrentProjectId();
  const info = db.prepare(
    "INSERT INTO structures (project_id, platform, hook_type, structure, source_signal_id) VALUES (?, ?, ?, ?, ?)"
  ).run(pid, b.platform, b.hook_type || null, b.structure, b.source_signal_id || null);
  recordAction({ objectType: "structure", objectId: Number(info.lastInsertRowid), action: "create" });
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}