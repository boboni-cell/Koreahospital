import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db
    .prepare(
      `SELECT date,
              SUM(followers) AS followers,
              SUM(likes) AS likes,
              SUM(views) AS views,
              SUM(saves) AS saves
       FROM metrics
       GROUP BY date
       ORDER BY date ASC
       LIMIT 30`
    )
    .all() as {
    date: string;
    followers: number;
    likes: number;
    views: number;
    saves: number;
  }[];
  return NextResponse.json(rows);
}
