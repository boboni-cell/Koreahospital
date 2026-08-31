import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const publishId = Number(req.nextUrl.searchParams.get("publish_id"));
  if (!publishId) return NextResponse.json({ error: "缺 publish_id" }, { status: 400 });
  const rows = db.prepare("SELECT * FROM analyses WHERE publish_id=? ORDER BY id DESC").all(publishId) as any[];
  const withProposals = rows.map((a) => ({
    ...a,
    proposals: db.prepare("SELECT * FROM writeback_proposals WHERE analysis_id=? ORDER BY id ASC").all(a.id),
  }));
  return NextResponse.json(withProposals);
}

function getMetric(publishId: number, win: string): Record<string, number> {
  const row = db.prepare("SELECT platform_metrics, business_metrics FROM publish_metric_snapshots WHERE publish_id=? AND window=?").get(publishId, win) as { platform_metrics: string; business_metrics: string } | undefined;
  const pm: Record<string, number> = {};
  const bm: Record<string, number> = {};
  try { Object.assign(pm, row ? JSON.parse(row.platform_metrics || "{}") : {}); } catch {}
  try { Object.assign(bm, row ? JSON.parse(row.business_metrics || "{}") : {}); } catch {}
  return { ...pm, ...bm };
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const publishId = Number(b.publish_id);
  if (!publishId) return NextResponse.json({ error: "缺 publish_id" }, { status: 400 });

  const w24 = getMetric(publishId, "24h");
  const w7 = getMetric(publishId, "7d");
  const w30 = getMetric(publishId, "30d");
  const insufficient = (db.prepare("SELECT COUNT(*) AS n FROM publish_metric_snapshots WHERE publish_id=? AND insufficient_data=1").get(publishId) as { n: number }).n > 0;

  let diagnosis: string;
  let confidence = "高";
  let evidence: string;
  const proposals: { target_library: string; change: string; reason: string }[] = [];

  if (insufficient || (!w24.views && !w30.views)) {
    diagnosis = "数据不足，本次不下结论（缺少 24h/7d/30d 完整窗口）。";
    confidence = "低";
    evidence = "标记 insufficient_data 或关键窗口缺失。";
  } else {
    const inquiries = (w24.inquiries ?? 0) + (w7.inquiries ?? 0) + (w30.inquiries ?? 0);
    const ctr = w24.views ? ((w24.inquiries ?? 0) / w24.views) * 100 : 0;
    if (inquiries >= 3 && ctr > 1) {
      diagnosis = "咨询转化良好，CTA 与私信引导有效；可复用该结构并强化私信钩子。";
      evidence = "24h 曝光 " + (w24.views ?? 0) + "，咨询 " + (w24.inquiries ?? 0) + "，CTR " + ctr.toFixed(2) + "%";
      proposals.push({ target_library: "cta", change: "CTA 改为“私信领取《植发避坑清单》”", reason: "咨询转化高，私信钩子有效" });
      proposals.push({ target_library: "structure", change: "沿用「痛点→方案→证据→CTA」结构", reason: "该结构带来稳定咨询" });
    } else {
      diagnosis = "互动偏弱，需优化开头钩子与封面；咨询量不足以支撑结论。";
      confidence = "中";
      evidence = "24h 曝光 " + (w24.views ?? 0) + "，互动 " + ((w24.likes ?? 0) + (w24.comments ?? 0));
      proposals.push({ target_library: "structure", change: "开头 3 秒改用更尖锐痛点提问", reason: "当前互动偏低" });
    }
  }

  const info = db.prepare("INSERT INTO analyses (publish_id, diagnosis, confidence, evidence, insufficient_data) VALUES (?, ?, ?, ?, ?)").run(publishId, diagnosis, confidence, evidence, insufficient ? 1 : 0);
  const analysisId = Number(info.lastInsertRowid);
  const ins = db.prepare("INSERT INTO writeback_proposals (analysis_id, target_library, change, reason, status) VALUES (?, ?, ?, ?, 'pending')");
  for (const p of proposals) ins.run(analysisId, p.target_library, p.change, p.reason);

  recordAction({ objectType: "analysis", objectId: analysisId, action: "analysis.create", detail: diagnosis, actorType: "analyst" });
  const rows = db.prepare("SELECT * FROM analyses WHERE publish_id=? ORDER BY id DESC").all(publishId) as any[];
  return NextResponse.json({ ok: true, id: analysisId, analyses: rows.map((a) => ({ ...a, proposals: db.prepare("SELECT * FROM writeback_proposals WHERE analysis_id=?").all(a.id) })) });
}
