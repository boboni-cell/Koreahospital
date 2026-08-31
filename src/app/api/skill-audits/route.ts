import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.prepare("SELECT * FROM skill_audits ORDER BY id ASC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("UPDATE skill_audits SET status=?, commit_ref=?, license=?, notes=?, audited_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(b.status ?? "suggested", b.commit_ref ?? null, b.license ?? null, b.notes ?? null, id);
  recordAction({ objectType: "skill_audit", objectId: id, action: "skill_audit." + (b.status ?? "update"), detail: `外部 Skill 审计 #${id}` });
  return NextResponse.json({ ok: true, id });
}
