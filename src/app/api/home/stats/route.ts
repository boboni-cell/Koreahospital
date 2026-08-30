import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;

  const pendingContents = one(
    "SELECT COUNT(*) AS n FROM contents WHERE status='draft'"
  );
  const totalAssets = one("SELECT COUNT(*) AS n FROM assets");
  const todayTasks = one("SELECT COUNT(*) AS n FROM tasks WHERE date(created_at)=date('now')");
  const activeSop = one("SELECT COUNT(*) AS n FROM sop_docs WHERE is_required=1");
  const totalFollowers = one("SELECT COALESCE(SUM(followers),0) AS n FROM metrics WHERE date=(SELECT MAX(date) FROM metrics)");

  return NextResponse.json({
    pendingContents,
    totalAssets,
    todayTasks,
    activeSop,
    totalFollowers,
  });
}
