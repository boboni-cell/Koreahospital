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

// 删除某次上传的记录 + 回滚对应的 metrics
export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });

  const record = db.prepare("SELECT * FROM metrics_uploads WHERE id = ?").get() as any;
  if (!record) return NextResponse.json({ error: "记录不存在" }, { status: 404 });

  // 删除对应的 metrics 记录（按 account_id 关联不确定，故不回滚 metrics，只删 uploading 记录）
  db.prepare("DELETE FROM metrics_uploads WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}