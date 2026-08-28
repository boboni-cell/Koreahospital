import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const totalFollowers = (
    db.prepare("SELECT COALESCE(SUM(followers),0) AS v FROM accounts").get() as {
      v: number;
    }
  ).v;
  const last = db
    .prepare(
      "SELECT date, followers, likes, saves, comments, shares, views FROM metrics ORDER BY date DESC LIMIT 1"
    )
    .get() as any;
  const prev = db
    .prepare(
      "SELECT date, followers, likes, saves, comments, shares, views FROM metrics ORDER BY date DESC LIMIT 2"
    )
    .all() as any[];
  const prevRow = prev[1] ?? last ?? null;
  const first = (
    db.prepare("SELECT MIN(date) AS d, COALESCE(SUM(views),0) AS v FROM metrics").get() as {
      d: string | null;
      v: number;
    }
  );
  const growth =
    prevRow && last
      ? Math.round(((last.followers - prevRow.followers) / (prevRow.followers || 1)) * 100)
      : 0;
  const engagement = last
    ? Math.round(
        ((last.likes + last.saves + last.comments + last.shares) /
          (last.views || 1)) *
          100
      )
    : 0;
  return NextResponse.json({
    totalFollowers,
    lastDate: last?.date ?? null,
    delta: (last?.followers ?? 0) - (prevRow?.followers ?? 0),
    growth,
    engagement,
    totalViews: first.v,
    periodStart: first.d,
  });
}
