import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM schedules ORDER BY slot_time ASC LIMIT 100").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const info = db
    .prepare("INSERT INTO schedules (account_id, slot_time, content_id) VALUES (?, ?, ?)")
    .run(body.account_id ?? null, body.slot_time ?? "", body.content_id ?? null);
  return NextResponse.json({ id: info.lastInsertRowid });
}
