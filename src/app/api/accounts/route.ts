import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare("SELECT * FROM accounts WHERE project_id=? ORDER BY id ASC")
    .all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare(
      "INSERT INTO accounts (platform, handle, role, followers, status, project_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(b.platform ?? "xiaohongshu", b.handle ?? "新账号", b.role ?? "official", b.followers ?? 0, b.status ?? "active", pid);
  return NextResponse.json({ id: info.lastInsertRowid });
}
