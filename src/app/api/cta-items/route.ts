import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db.prepare("SELECT * FROM cta_items WHERE (project_id=? OR project_id IS NULL) AND status='active' ORDER BY id DESC").all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.platform || !b.text) return NextResponse.json({ error: "缺 platform/text" }, { status: 400 });
  const pid = getCurrentProjectId();
  const info = db.prepare(
    "INSERT INTO cta_items (project_id, platform, funnel_stage, text, restricted_scenarios) VALUES (?, ?, ?, ?, ?)"
  ).run(pid, b.platform, b.funnel_stage || null, b.text, b.restricted_scenarios || null);
  recordAction({ objectType: "cta_item", objectId: Number(info.lastInsertRowid), action: "create" });
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}