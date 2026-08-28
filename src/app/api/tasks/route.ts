import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id DESC LIMIT 100").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const info = db
    .prepare("INSERT INTO tasks (title, status, due, assignee) VALUES (?, ?, ?, ?)")
    .run(body.title ?? "新任务", body.status ?? "todo", body.due ?? null, body.assignee ?? null);
  return NextResponse.json({ id: info.lastInsertRowid });
}
