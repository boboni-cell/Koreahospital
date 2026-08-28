import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  let rows: any[];
  if (date) {
    rows = db
      .prepare("SELECT * FROM contents WHERE DATE(created_at)=? OR scheduled_for=? ORDER BY id DESC")
      .all(date, date);
  } else {
    rows = db.prepare("SELECT * FROM contents ORDER BY id DESC LIMIT 50").all();
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const info = db
    .prepare(
      "INSERT INTO contents (title, body, platform, role, status, scheduled_for) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      body.title ?? "未命名",
      body.body ?? "",
      body.platform ?? null,
      body.role ?? null,
      body.status ?? "draft",
      body.scheduled_for ?? null
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}
