import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare("SELECT * FROM topics WHERE project_id=? ORDER BY id DESC LIMIT 100")
    .all(pid);
  return NextResponse.json(rows);
}

export function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  db.prepare("DELETE FROM topics WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pid = getCurrentProjectId();
  const info = db
    .prepare(
      "INSERT INTO topics (title, description, source, heat_score, target_accounts, project_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      body.title ?? "",
      body.description ?? null,
      body.source ?? "manual",
      body.heat_score ?? 5,
      body.target_accounts ?? null,
      pid
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}
