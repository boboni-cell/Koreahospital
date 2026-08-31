import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare("SELECT * FROM assets WHERE project_id=? ORDER BY id DESC LIMIT 100")
    .all(pid);
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare(
    "UPDATE assets SET sensitivity=?, ai_suggested=?, authorization_scope=?, expires_at=?, allowed_platforms=?, ai_editable=? WHERE id=?"
  ).run(
    b.sensitivity ?? "normal",
    b.ai_suggested ?? null,
    b.authorization_scope ?? null,
    b.expires_at ?? null,
    b.allowed_platforms ?? null,
    b.ai_editable == null ? 1 : Number(b.ai_editable),
    id
  );
  recordAction({ objectType: "asset", objectId: id, action: "asset.gate", detail: `素材 #${id} 分级=${b.sensitivity ?? "normal"}，授权=${b.license ?? "-"}` });
  return NextResponse.json({ ok: true, id });
}
