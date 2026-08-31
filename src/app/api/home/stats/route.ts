import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const pid = getCurrentProjectId();
  const one = (sql: string, ...args: unknown[]) => (db.prepare(sql).get(...args) as { n: number }).n;

  const pendingContents = one(
    "SELECT COUNT(*) AS n FROM contents WHERE project_id=? AND status='draft'", pid
  );
  const totalAssets = one("SELECT COUNT(*) AS n FROM assets WHERE project_id=?", pid);
  const todayTasks = one(
    "SELECT COUNT(*) AS n FROM tasks WHERE project_id=? AND date(created_at)=date('now')", pid
  );
  const activeSop = one(
    "SELECT COUNT(*) AS n FROM sop_docs WHERE project_id=? AND is_required=1", pid
  );
  const totalFollowers = one(
    "SELECT COALESCE(SUM(m.followers),0) AS n FROM metrics m WHERE m.account_id IN (SELECT id FROM accounts WHERE project_id=?) AND m.date=(SELECT MAX(date) FROM metrics)",
    pid
  );

  return NextResponse.json({
    pendingContents,
    totalAssets,
    todayTasks,
    activeSop,
    totalFollowers,
  });
}
