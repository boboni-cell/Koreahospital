import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM notes ORDER BY id DESC LIMIT 100").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const info = db
    .prepare(
      "INSERT INTO notes (patient_name, channel, content, summary) VALUES (?, ?, ?, ?)"
    )
    .run(b.patient_name ?? null, b.channel ?? "微信", b.content ?? "", b.summary ?? null);
  return NextResponse.json({ id: info.lastInsertRowid });
}
