import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const briefId = Number(req.nextUrl.searchParams.get("brief_id"));
  if (!briefId) return NextResponse.json({ error: "缺 brief_id" }, { status: 400 });
  const rows = db
    .prepare(
      "SELECT v.*, a.handle AS account_name, a.platform AS account_platform, cp.name AS pillar_name FROM content_variants v LEFT JOIN accounts a ON a.id=v.account_id LEFT JOIN (SELECT ap.account_id, cp.name FROM account_pillars ap JOIN content_pillars cp ON cp.id=ap.pillar_id) cp ON cp.account_id=v.account_id WHERE v.brief_id=? ORDER BY v.id ASC"
    )
    .all(briefId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const briefId = Number(b.brief_id);
  if (!briefId) return NextResponse.json({ error: "缺 brief_id" }, { status: 400 });
  const info = db
    .prepare("INSERT INTO content_variants (brief_id, platform, account_id, format, content, workflow_status) VALUES (?, ?, ?, ?, ?, 'draft')")
    .run(briefId, b.platform ?? null, b.account_id ?? null, b.format ?? "text", b.content ?? null);
  db.prepare("INSERT INTO variant_versions (variant_id, version, content) VALUES (?, 1, ?)").run(Number(info.lastInsertRowid), b.content ?? null);
  recordAction({ objectType: "content_variant", objectId: Number(info.lastInsertRowid), action: "content_variant.create", detail: `平台版本 #${info.lastInsertRowid}` });
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const content = b.content ?? null;
  const cur = db.prepare("SELECT (SELECT COUNT(*) FROM variant_versions WHERE variant_id=?) AS version FROM content_variants WHERE id=?").get(id, id) as { version: number } | undefined;
  const nextVer = (cur?.version ?? 0) + 1;
  db.prepare("UPDATE content_variants SET content=?, workflow_status=? WHERE id=?").run(content, b.workflow_status ?? "draft", id);
  db.prepare("INSERT INTO variant_versions (variant_id, version, content) VALUES (?, ?, ?)").run(id, nextVer, content);
  recordAction({ objectType: "content_variant", objectId: id, action: "content_variant.update", detail: `更新平台版本 #${id} → v${nextVer}` });
  return NextResponse.json({ ok: true, id, version: nextVer });
}
