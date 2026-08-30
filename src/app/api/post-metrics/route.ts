import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

/** 已发布内容的运行时数据回填（点赞/收藏/评论/分享/播放），记入 post_metrics 并标记已回填 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const contentId = body.content_id;
  if (!contentId) return NextResponse.json({ error: "缺 content_id" }, { status: 400 });

  db.prepare(
    "INSERT INTO post_metrics (content_id, date, likes, saves, comments, shares, views) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    contentId,
    body.date ?? new Date().toISOString().slice(0, 10),
    body.likes ?? 0,
    body.saves ?? 0,
    body.comments ?? 0,
    body.shares ?? 0,
    body.views ?? 0
  );
  db.prepare("UPDATE contents SET data_filled=1 WHERE id=?").run(contentId);
  return NextResponse.json({ ok: true });
}

/** 某内容已回填的数据（用于回显） */
export async function GET(req: NextRequest) {
  const contentId = req.nextUrl.searchParams.get("content_id");
  if (!contentId) return NextResponse.json([]);
  const rows = db
    .prepare("SELECT * FROM post_metrics WHERE content_id=? ORDER BY id DESC LIMIT 20")
    .all(contentId);
  return NextResponse.json(rows);
}
