import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM accounts ORDER BY id ASC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const info = db
    .prepare(
      "INSERT INTO accounts (platform, handle, role, followers, status) VALUES (?, ?, ?, ?, ?)"
    )
    .run(b.platform ?? "xiaohongshu", b.handle ?? "新账号", b.role ?? "official", b.followers ?? 0, b.status ?? "active");
  return NextResponse.json({ id: info.lastInsertRowid });
}
