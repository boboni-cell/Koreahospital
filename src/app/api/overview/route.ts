import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const one = (sql: string, ...args: unknown[]) => (db.prepare(sql).get(...args) as { n: number }).n;

  const pendingContents = one("SELECT COUNT(*) AS n FROM contents WHERE project_id=? AND status='draft'", pid);
  const pendingReview = one("SELECT COUNT(*) AS n FROM content_variants v JOIN content_briefs b ON b.id=v.brief_id WHERE b.project_id=? AND v.workflow_status='human_review'", pid);
  const approved = one("SELECT COUNT(*) AS n FROM content_variants v JOIN content_briefs b ON b.id=v.brief_id WHERE b.project_id=? AND v.workflow_status='approved'", pid);
  const publishedSnapshots = one("SELECT COUNT(*) AS n FROM publish_snapshots ps JOIN content_variants v ON v.id=ps.variant_id JOIN content_briefs b ON b.id=v.brief_id WHERE b.project_id=?", pid);
  const pendingBackfill = one("SELECT COUNT(*) AS n FROM publish_snapshots ps WHERE NOT EXISTS (SELECT 1 FROM publish_metric_snapshots ms WHERE ms.publish_id=ps.id AND ms.window='24h')");
  const blocked = one("SELECT COUNT(*) AS n FROM content_variants v JOIN content_briefs b ON b.id=v.brief_id WHERE b.project_id=? AND v.workflow_status='blocked'", pid);
  const sensitiveUnauthorized = one("SELECT COUNT(*) AS n FROM assets WHERE project_id=? AND sensitivity='sensitive' AND license != 'authorized'", pid);
  const pendingWriteback = one("SELECT COUNT(*) AS n FROM writeback_proposals WHERE status='pending'");

  return NextResponse.json({
    pendingContents,
    pendingReview,
    pendingPublish: Math.max(approved - publishedSnapshots, 0),
    pendingBackfill,
    riskFlags: blocked + sensitiveUnauthorized,
    pendingWriteback,
  });
}
