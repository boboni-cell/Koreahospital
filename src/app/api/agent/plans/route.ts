import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export const dynamic = "force-dynamic";

/** GET /api/agent/plans 返回当前项目最近的计划列表（每条带 steps）。 */
export async function GET(req: NextRequest) {
  const pid = getCurrentProjectId();
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)));
  const rows = db.prepare(`
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY date(created_at, '-' || ((CAST(strftime('%w', created_at) AS INTEGER) + 6) % 7) || ' days')
      ORDER BY id ASC
    ) AS weekly_number
    FROM agent_plans
    WHERE project_id=?
    ORDER BY id DESC LIMIT ?
  `).all(pid, limit) as any[];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      weekly_number: r.weekly_number,
      task: r.task,
      note: r.note,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      steps: (() => { try { return JSON.parse(r.steps_json || "[]"); } catch { return []; } })(),
    }))
  );
}
