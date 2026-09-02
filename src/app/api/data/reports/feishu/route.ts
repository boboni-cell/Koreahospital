import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { createFeishuReport } from "@/lib/feishu";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const projectId = getCurrentProjectId();
  const draft = db.prepare("SELECT * FROM report_drafts WHERE id=? AND project_id=?").get(id, projectId) as any;
  if (!draft) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  const rows = db.prepare(`SELECT p.title, p.platform, a.handle, m.views,
    ROUND(CASE WHEN m.views > 0 THEN (m.likes + m.saves + m.comments + m.shares) * 100.0 / m.views ELSE 0 END, 2) AS engagement_rate,
    ROUND(CASE WHEN m.views > 0 THEN m.shares * 100.0 / m.views ELSE 0 END, 2) AS share_rate
    FROM post_analytics p JOIN post_metric_windows m ON m.post_id=p.id LEFT JOIN accounts a ON a.id=p.account_id
    WHERE p.project_id=? AND m.window='7d' AND date(p.published_at) BETWEEN date(?) AND date(?) ORDER BY date(p.published_at) DESC`).all(projectId, draft.period_start, draft.period_end) as any[];
  let actions: string[] = [];
  try { actions = JSON.parse(draft.actions_json || "[]"); } catch {}
  try {
    const doc = await createFeishuReport(`复盘报告-${draft.period_end}`, { diagnosis: draft.diagnosis, evidence: draft.evidence, actions, periodStart: draft.period_start, periodEnd: draft.period_end }, rows);
    return NextResponse.json({ ok: true, docUrl: doc.url, count: rows.length });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 502 });
  }
}
