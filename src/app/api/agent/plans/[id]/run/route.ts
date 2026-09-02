import { NextResponse } from "next/server";
import db from "@/lib/db";
import { runPlanStep } from "@/lib/agent-plan-executor";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const planId = Number(id);
  const row = db.prepare("SELECT status, steps_json FROM agent_plans WHERE id=?").get(planId) as any;
  if (!row) return NextResponse.json({ error: "计划不存在" }, { status: 404 });
  if (row.status === "running") return NextResponse.json({ error: "计划正在执行" }, { status: 409 });
  let steps: any[];
  try { steps = JSON.parse(row.steps_json || "[]"); } catch { steps = []; }
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status === "done") continue;
    try { await runPlanStep(planId, i); } catch { break; }
  }
  const latest = db.prepare("SELECT status FROM agent_plans WHERE id=?").get(planId) as any;
  return NextResponse.json({ ok: latest?.status === "completed", status: latest?.status || "partial" });
}
