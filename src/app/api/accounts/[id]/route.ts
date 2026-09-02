import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  db.prepare(
    "UPDATE accounts SET platform=?, handle=?, external_id=?, profile_url=?, role=?, followers=?, status=?, positioning=?, operator_id=?, environment_status=? WHERE id=?"
  ).run(
    b.platform ?? "xiaohongshu",
    b.handle ?? "未命名",
    b.external_id ?? null,
    b.profile_url ?? null,
    b.role ?? "official",
    b.followers ?? 0,
    b.status ?? "active",
    b.positioning ?? null,
    Number(b.operator_id) || null,
    b.environment_status ?? "configuring",
    id
  );
  recordAction({
    objectType: "account",
    objectId: Number(id),
    action: "account.update",
    detail: `更新账号 #${id} 环境配置`,
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM account_pillars WHERE account_id=?").run(id);
  db.prepare("DELETE FROM accounts WHERE id=?").run(id);
  recordAction({
    objectType: "account",
    objectId: Number(id),
    action: "account.delete",
    detail: `删除账号 #${id}`,
  });
  return NextResponse.json({ ok: true, id });
}
