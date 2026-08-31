import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare(
      "SELECT a.id, a.platform, a.handle, a.role, a.followers, a.status, a.project_id, a.positioning, a.operator_id, a.environment_status, a.created_at, o.name AS operator_name FROM accounts a LEFT JOIN operators o ON o.id=a.operator_id WHERE a.project_id=? ORDER BY a.id ASC"
    )
    .all(pid);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const pid = getCurrentProjectId();
  const opId = Number(b.operator_id) || null;
  const info = db
    .prepare(
      "INSERT INTO accounts (platform, handle, role, followers, status, project_id, positioning, operator_id, environment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      b.platform ?? "xiaohongshu",
      b.handle ?? "新账号",
      b.role ?? "official",
      b.followers ?? 0,
      b.status ?? "active",
      pid,
      b.positioning ?? null,
      opId,
      b.environment_status ?? "configuring"
    );
  recordAction({
    objectType: "account",
    objectId: Number(info.lastInsertRowid),
    action: "account.create",
    toStatus: b.status ?? "active",
    detail: `新增账号 ${b.handle ?? "新账号"} (platform=${b.platform ?? "xiaohongshu"})`,
  });
  return NextResponse.json({ id: info.lastInsertRowid });
}
