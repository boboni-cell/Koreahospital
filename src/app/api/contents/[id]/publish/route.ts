import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const now = new Date().toISOString();
  db.prepare("UPDATE contents SET status='published', published_at=COALESCE(published_at,?) WHERE id=?").run(now, id);
  return NextResponse.json({ ok: true, id, published_at: now });
}
