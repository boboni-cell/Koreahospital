import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM sop_docs WHERE id=?").get(id);
  return NextResponse.json(row ?? null);
}
