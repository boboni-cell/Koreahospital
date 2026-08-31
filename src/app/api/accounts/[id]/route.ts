import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  db.prepare(
    "UPDATE accounts SET platform=?, handle=?, role=?, followers=?, status=?, positioning=?, operator_id=?, environment_status=? WHERE id=?"
  ).run(
    b.platform ?? "xiaohongshu",
    b.handle ?? "未命名",
    b.role ?? "official",
    b.followers ?? 0,
    b.status ?? "active",
    b.positioning ?? null,
    Number(b.operator_id) || null,
    b.environment_status ?? "configuring",
    id
  );
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM account_pillars WHERE account_id=?").run(id);
  db.prepare("DELETE FROM accounts WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id });
}
