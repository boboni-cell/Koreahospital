import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// 查询上传记录列表
export async function GET() {
  const rows = db
    .prepare(`
      SELECT id, rows_count, inserted, skipped, created_at 
      FROM metrics_uploads 
      ORDER BY id DESC 
      LIMIT 100
    `)
    .all() as { id: number; rows_count: number; inserted: number; skipped: number; created_at: string }[];
  return NextResponse.json(rows);
}

// 只删除上传事件元数据；已录入的运营数据保持不变
export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });

  const record = db.prepare("SELECT id FROM metrics_uploads WHERE id = ?").get(id) as
    | { id: number }
    | undefined;
  if (!record) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  db.prepare("DELETE FROM metrics_uploads WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
