import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare(`
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY date(created_at, '-' || ((CAST(strftime('%w', created_at) AS INTEGER) + 6) % 7) || ' days')
      ORDER BY agent_plans.id ASC
    ) AS weekly_number
    FROM agent_plans WHERE id=? AND project_id=?
  `).get(id, getCurrentProjectId()) as any;
  if (!row) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  let steps = [];
  try { steps = JSON.parse(row.steps_json || "[]"); } catch {}
  return NextResponse.json({ id: row.id, weekly_number: row.weekly_number, task: row.task, note: row.note, status: row.status, created_at: row.created_at, updated_at: row.updated_at, steps });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare("SELECT status FROM agent_plans WHERE id=? AND project_id=?").get(id, getCurrentProjectId()) as any;
  if (!row) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  if (row.status === "running") return NextResponse.json({ error: "计划正在执行，暂不能删除" }, { status: 409 });
  db.prepare("DELETE FROM agent_plans WHERE id=? AND project_id=?").run(id, getCurrentProjectId());
  return NextResponse.json({ ok: true, id: Number(id) });
}
