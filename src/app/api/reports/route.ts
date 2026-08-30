import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * 运营周/日报：按日期聚合「已发布内容」的运行数据（post_metrics）+ 内容清单。
 * range=day | week
 */
export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "week";
  const today = new Date().toISOString().slice(0, 10);
  let start: string, end: string;
  if (range === "day") {
    start = today;
    end = today;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    start = d.toISOString().slice(0, 10);
    end = today;
  }

  // 每个日期各指标合计（post_metrics）
  const rows = db
    .prepare(
      `SELECT pm.date, COUNT(DISTINCT pm.content_id) AS posts,
              COALESCE(SUM(pm.likes),0) AS likes, COALESCE(SUM(pm.saves),0) AS saves,
              COALESCE(SUM(pm.comments),0) AS comments, COALESCE(SUM(pm.shares),0) AS shares,
              COALESCE(SUM(pm.views),0) AS views
       FROM post_metrics pm
       WHERE pm.date BETWEEN ? AND ?
       GROUP BY pm.date ORDER BY pm.date ASC`
    )
    .all(start, end) as { date: string; posts: number; likes: number; saves: number; comments: number; shares: number; views: number }[];

  // 该区间已发布内容清单（合并非空数据）
  const contents = db
    .prepare(
      `SELECT c.id, c.title, c.platform, c.role, c.published_at, c.data_filled,
              COALESCE(pm.likes,0) AS likes, COALESCE(pm.views,0) AS views
       FROM contents c
       LEFT JOIN post_metrics pm ON pm.content_id = c.id
       WHERE c.status='published' AND c.published_at IS NOT NULL
         AND date(c.published_at) BETWEEN ? AND ?
       ORDER BY c.published_at DESC`
    )
    .all(start, end) as any[];

  const totals = rows.reduce(
    (a, r) => ({
      posts: a.posts + r.posts,
      likes: a.likes + r.likes,
      saves: a.saves + r.saves,
      comments: a.comments + r.comments,
      shares: a.shares + r.shares,
      views: a.views + r.views,
    }),
    { posts: 0, likes: 0, saves: 0, comments: 0, shares: 0, views: 0 }
  );

  return NextResponse.json({ range, start, end, rows, contents, totals });
}
