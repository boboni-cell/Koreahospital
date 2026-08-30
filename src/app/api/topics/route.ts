import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM topics ORDER BY id DESC LIMIT 100").all();
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
  const info = db
    .prepare(
      "INSERT INTO topics (title, description, source, heat_score, target_accounts) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      body.title ?? "",
      body.description ?? null,
      body.source ?? "manual",
      body.heat_score ?? 5,
      body.target_accounts ?? null
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}
