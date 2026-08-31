import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const pid = getCurrentProjectId();
  let rows: any[];
  if (date) {
    rows = db
      .prepare("SELECT * FROM contents WHERE project_id=? AND (DATE(created_at)=? OR scheduled_for=?) ORDER BY id DESC")
      .all(pid, date, date);
  } else {
    rows = db
      .prepare("SELECT * FROM contents WHERE project_id=? ORDER BY id DESC LIMIT 50")
      .all(pid);
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare(
      "INSERT INTO contents (title, body, platform, role, status, scheduled_for, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      body.title ?? "未命名",
      body.body ?? "",
      body.platform ?? null,
      body.role ?? null,
      body.status ?? "draft",
      body.scheduled_for ?? null,
      pid
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}
