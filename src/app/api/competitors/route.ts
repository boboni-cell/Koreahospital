import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db.prepare("SELECT * FROM competitors WHERE (project_id=? OR project_id IS NULL) AND status='active' ORDER BY id DESC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.platform || !b.account) return NextResponse.json({ error: "缺 platform/account" }, { status: 400 });
  const pid = getCurrentProjectId();
  const info = db.prepare(
    "INSERT INTO competitors (project_id, platform, account, positioning, evidence, observed_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(pid, b.platform, b.account, b.positioning || null, b.evidence || null, b.observed_at || new Date().toISOString());
  recordAction({ objectType: "competitor", objectId: Number(info.lastInsertRowid), action: "create", detail: b.account });
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}