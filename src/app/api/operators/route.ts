import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.prepare("SELECT * FROM operators ORDER BY id ASC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const info = db
    .prepare("INSERT INTO operators (name, responsibility, status) VALUES (?, ?, ?)")
    .run(b.name ?? "未命名", b.responsibility ?? null, b.status ?? "active");
  return NextResponse.json({ id: info.lastInsertRowid });
}
