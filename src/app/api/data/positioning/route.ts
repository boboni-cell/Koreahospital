import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { median, metricRate } from "@/lib/post-analytics";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const accountId = Number(req.nextUrl.searchParams.get("account_id")) || null;
  const accounts = db.prepare("SELECT id, platform, handle, positioning, environment_status FROM accounts WHERE project_id=? ORDER BY platform, id").all(projectId);
  const brief = db.prepare("SELECT audience, voice, conversion_goal, banned_terms FROM projects WHERE id=?").get(projectId);
  if (!accountId) return NextResponse.json({ accounts, brief, versions: [], pillars: [] });
  const versions = db.prepare("SELECT * FROM account_positioning_versions WHERE account_id=? ORDER BY version DESC").all(accountId);
  const pillars = db.prepare(`
    SELECT cp.id, cp.name, cp.description, ap.target_ratio
    FROM content_pillars cp LEFT JOIN account_pillars ap ON ap.pillar_id=cp.id AND ap.account_id=?
    WHERE cp.project_id=? ORDER BY cp.id
  `).all(accountId, projectId) as { id: number; name: string; description: string | null; target_ratio: number | null }[];
  const performance = pillars.map((pillar) => {
    const rows = db.prepare(`SELECT m.views, m.likes, m.saves, m.comments, m.shares, m.follower_gain FROM post_analytics p JOIN post_metric_windows m ON m.post_id=p.id AND m.window='7d' WHERE p.project_id=? AND p.account_id=? AND p.pillar_id=? AND m.views>=1000`)
      .all(projectId, accountId, pillar.id) as { views: number; likes: number; saves: number; comments: number; shares: number; follower_gain: number | null }[];
    return { ...pillar, posts: rows.length, engagement_rate: median(rows.map((row) => metricRate(row.likes + row.saves + row.comments + row.shares, row.views))), share_rate: median(rows.map((row) => metricRate(row.shares, row.views))), follower_conversion_rate: median(rows.map((row) => metricRate(row.follower_gain, row.views))) };
  });
  return NextResponse.json({ accounts, brief, versions, pillars: performance });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accountId = Number(body.account_id);
  if (!accountId) return NextResponse.json({ error: "请选择账号" }, { status: 400 });
  const version = (db.prepare("SELECT COALESCE(MAX(version),0)+1 AS v FROM account_positioning_versions WHERE account_id=?").get(accountId) as { v: number }).v;
  const info = db.prepare(`INSERT INTO account_positioning_versions (account_id, version, positioning, audience, voice, cta, banned_terms, frequency, notes, evidence, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`)
    .run(accountId, version, body.positioning ?? null, body.audience ?? null, body.voice ?? null, body.cta ?? null, body.banned_terms ?? null, body.frequency ?? null, body.notes ?? null, body.evidence ?? null);
  recordAction({ objectType: "account_positioning", objectId: Number(info.lastInsertRowid), action: "positioning.draft", detail: `账号 #${accountId} 定位 v${version} 保存为草稿` });
  return NextResponse.json({ id: info.lastInsertRowid, version });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  const version = db.prepare("SELECT * FROM account_positioning_versions WHERE id=?").get(id) as any;
  if (!version) return NextResponse.json({ error: "定位版本不存在" }, { status: 404 });
  const run = db.transaction(() => {
    db.prepare("UPDATE account_positioning_versions SET status='archived' WHERE account_id=? AND status='active'").run(version.account_id);
    db.prepare("UPDATE account_positioning_versions SET status='active', activated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    db.prepare("UPDATE accounts SET positioning=? WHERE id=?").run(version.positioning, version.account_id);
  }); run();
  recordAction({ objectType: "account_positioning", objectId: id, action: "positioning.activate", detail: `账号 #${version.account_id} 启用定位 v${version.version}` });
  return NextResponse.json({ ok: true, id });
}
