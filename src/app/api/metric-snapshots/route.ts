import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const publishId = Number(req.nextUrl.searchParams.get("publish_id"));
  if (publishId) {
    const rows = db.prepare("SELECT * FROM publish_metric_snapshots WHERE publish_id=? ORDER BY window ASC").all(publishId);
    return NextResponse.json(rows);
  }
  // 全部发布 + 已填窗口
  const publishes = db.prepare("SELECT id, variant_id, platform, account_name, content_version, published_at FROM publish_snapshots ORDER BY id DESC").all() as any[];
  const withWindows = publishes.map((p) => {
    const w = db.prepare("SELECT * FROM publish_metric_snapshots WHERE publish_id=? ORDER BY window ASC").all(p.id);
    return { ...p, windows: w };
  });
  return NextResponse.json(withWindows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const publishId = Number(b.publish_id);
  const window = b.window === "7d" || b.window === "30d" ? b.window : "24h";
  if (!publishId) return NextResponse.json({ error: "缺 publish_id" }, { status: 400 });
  const platform = JSON.stringify(b.platform_metrics ?? {});
  const business = JSON.stringify(b.business_metrics ?? {});
  db.prepare(
    "INSERT INTO publish_metric_snapshots (publish_id, window, platform_metrics, business_metrics, insufficient_data, observed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(publish_id, window) DO UPDATE SET platform_metrics=excluded.platform_metrics, business_metrics=excluded.business_metrics, insufficient_data=excluded.insufficient_data, observed_at=CURRENT_TIMESTAMP"
  ).run(publishId, window, platform, business, b.insufficient_data ? 1 : 0);
  return NextResponse.json({ ok: true, publish_id: publishId, window });
}
