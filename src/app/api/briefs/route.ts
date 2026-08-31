import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare(
      "SELECT b.*, (SELECT COUNT(*) FROM content_variants v WHERE v.brief_id=b.id) AS variant_count FROM content_briefs b WHERE b.project_id=? ORDER BY b.id DESC"
    )
    .all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare("INSERT INTO content_briefs (topic_id, project_id, title, audience, objective, facts, evidence, compliance_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(b.topic_id ?? null, pid, b.title ?? "未命名简报", b.audience ?? null, b.objective ?? null, b.facts ?? null, b.evidence ?? null, b.compliance_notes ?? null);
  recordAction({ objectType: "content_brief", objectId: Number(info.lastInsertRowid), action: "content_brief.create", detail: `新建母版简报 ${b.title ?? ""}` });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("UPDATE content_briefs SET title=?, audience=?, objective=?, facts=?, evidence=?, compliance_notes=? WHERE id=?")
    .run(b.title ?? null, b.audience ?? null, b.objective ?? null, b.facts ?? null, b.evidence ?? null, b.compliance_notes ?? null, id);
  recordAction({ objectType: "content_brief", objectId: id, action: "content_brief.update", detail: `更新母版简报 #${id}` });
  return NextResponse.json({ ok: true, id });
}
