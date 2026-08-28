import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM sop_docs ORDER BY sort_order ASC, id ASC")
    .all();
  return NextResponse.json(rows);
}
