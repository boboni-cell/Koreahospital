import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM agent_plans WHERE id=?").get(id) as any;
  if (!row) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  let steps = [];
  try { steps = JSON.parse(row.steps_json || "[]"); } catch {}
  return NextResponse.json({ id: row.id, task: row.task, note: row.note, status: row.status, created_at: row.created_at, updated_at: row.updated_at, steps });
}
