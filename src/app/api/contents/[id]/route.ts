import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  db.prepare(
    "UPDATE contents SET title=COALESCE(?,title), body=COALESCE(?,body), platform=COALESCE(?,platform), role=COALESCE(?,role), status=COALESCE(?,status), scheduled_for=COALESCE(?,scheduled_for), cover_url=COALESCE(?,cover_url) WHERE id=?"
  ).run(
    body.title ?? null,
    body.body ?? null,
    body.platform ?? null,
    body.role ?? null,
    body.status ?? null,
    body.scheduled_for ?? null,
    body.cover_url ?? null,
    id
  );
  // 标记：由 Agent/mock 保存的内容需要人工二次编辑；人工编辑/确认后清除
  if (body.from_agent) {
    db.prepare("UPDATE contents SET needs_human_review=1, last_agent_role=? WHERE id=?").run(body.from_agent, id);
  }
  if (body.cleared_review) {
    db.prepare("UPDATE contents SET needs_human_review=0 WHERE id=?").run(id);
  }
  // 同步到内容排期：scheduled_for 更新时覆盖/新建对应排期
  if (body.scheduled_for) {
    const existing = db
      .prepare("SELECT id FROM schedules WHERE content_id=?")
      .get(id) as { id: number } | undefined;
    if (existing) {
      db.prepare("UPDATE schedules SET slot_time=? WHERE content_id=?").run(body.scheduled_for, id);
    } else {
      db.prepare("INSERT INTO schedules (account_id, slot_time, content_id) VALUES (?, ?, ?)").run(
        body.account_id ?? null,
        body.scheduled_for,
        id
      );
    }
  }
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM schedules WHERE content_id=?").run(id);
  db.prepare("DELETE FROM contents WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id });
}
