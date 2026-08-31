import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accId = Number(req.nextUrl.searchParams.get("accountId"));
  if (!accId) return NextResponse.json({ error: "缺 accountId" }, { status: 400 });
  const rows = db
    .prepare(
      "SELECT ap.id, ap.pillar_id, ap.target_ratio, cp.name, cp.description FROM account_pillars ap JOIN content_pillars cp ON cp.id=ap.pillar_id WHERE ap.account_id=? ORDER BY cp.id ASC"
    )
    .all(accId);
  return NextResponse.json(rows);
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const accId = Number(b.accountId);
  if (!accId) return NextResponse.json({ error: "缺 accountId" }, { status: 400 });
  const items: { pillarId: number; targetRatio: number }[] = Array.isArray(b.items) ? b.items : [];
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM account_pillars WHERE account_id=?").run(accId);
    const ins = db.prepare(
      "INSERT OR IGNORE INTO account_pillars (account_id, pillar_id, target_ratio) VALUES (?, ?, ?)"
    );
    for (const it of items) {
      if (it && it.pillarId) ins.run(accId, Number(it.pillarId), Number(it.targetRatio) || 0);
    }
  });
  tx();
  recordAction({
    objectType: "account",
    objectId: accId,
    action: "account_pillars.update",
    detail: `更新账号 #${accId} 的内容支柱与占比（${items.length} 项）`,
  });
  return NextResponse.json({ ok: true, accountId: accId });
}
