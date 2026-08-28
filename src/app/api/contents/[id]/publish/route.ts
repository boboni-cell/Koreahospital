import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("UPDATE contents SET status='published' WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id });
}
