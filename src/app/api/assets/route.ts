import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM assets ORDER BY id DESC LIMIT 100").all();
  return NextResponse.json(rows);
}
