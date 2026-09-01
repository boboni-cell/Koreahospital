import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM knowledge_items WHERE id=?").get(id);
  if (!row) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const exists = db.prepare("SELECT id FROM knowledge_items WHERE id=?").get(id);
  if (!exists) return NextResponse.json({ error: "未找到" }, { status: 404 });
  // media_urls 必须是 JSON 字符串；其它字段可选
  const media = typeof b.media_urls === "string" ? b.media_urls : JSON.stringify(b.media_urls ?? []);
  db.prepare(
    "UPDATE knowledge_items SET title=COALESCE(?, title), content=COALESCE(?, content), evidence=COALESCE(?, evidence), platform=COALESCE(?, platform), media_urls=? WHERE id=?"
  ).run(
    b.title ?? null,
    b.content ?? null,
    b.evidence ?? null,
    b.platform ?? null,
    media,
    id
  );
  recordAction({ objectType: "knowledge", objectId: Number(id), action: "knowledge.update_media", detail: `知识条目 #${id} 更新（含 ${media.length} 字符 media_urls）` });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM knowledge_items WHERE id=?").run(id);
  recordAction({ objectType: "knowledge", objectId: Number(id), action: "knowledge.delete", detail: `删除知识条目 #${id}` });
  return NextResponse.json({ ok: true, id });
}