import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json();
  const assetId = Number(b.asset_id);
  if (!assetId) return NextResponse.json({ error: "缺 asset_id" }, { status: 400 });
  const info = db
    .prepare("INSERT INTO asset_usage (asset_id, content_id) VALUES (?, ?)")
    .run(assetId, b.content_id ?? null);
  db.prepare("UPDATE assets SET usage_count=usage_count+1 WHERE id=?").run(assetId);
  return NextResponse.json({ id: info.lastInsertRowid });
}
