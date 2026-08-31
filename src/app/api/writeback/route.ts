import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const rows = db.prepare("SELECT w.*, a.publish_id, a.diagnosis FROM writeback_proposals w JOIN analyses a ON a.id=w.analysis_id WHERE w.status=? ORDER BY w.id DESC").all(status);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.proposal_id);
  if (!id) return NextResponse.json({ error: "缺 proposal_id" }, { status: 400 });
  const action = b.action === "confirm" ? "confirmed" : "rejected";
  const proposal = db.prepare("SELECT * FROM writeback_proposals WHERE id=?").get(id) as any;
  if (!proposal) return NextResponse.json({ error: "建议不存在" }, { status: 404 });
  const op = db.prepare("SELECT id FROM operators ORDER BY id ASC LIMIT 1").get() as { id: number } | undefined;

  if (action === "confirmed") {
    // 写回知识库（人工确认才写；拒绝不改）
    const pid = getCurrentProjectId();
    db.prepare("INSERT INTO knowledge_items (project_id, kind, platform, title, content, evidence, status) VALUES (?, ?, NULL, ?, ?, ?, 'active')")
      .run(pid, proposal.target_library === "cta" ? "cta" : proposal.target_library === "structure" ? "structure" : "comment", "回写：" + proposal.change, proposal.change, "来源：分析 #" + proposal.analysis_id);
    db.prepare("UPDATE writeback_proposals SET status=?, confirmed_by=? WHERE id=?").run(action, op?.id ?? null, id);
  } else {
    db.prepare("UPDATE writeback_proposals SET status=?, confirmed_by=? WHERE id=?").run(action, op?.id ?? null, id);
  }

  recordAction({ objectType: "writeback_proposal", objectId: id, action: "writeback." + action, detail: `回写建议 #${id} ${action}` });
  return NextResponse.json({ ok: true, id, status: action });
}
