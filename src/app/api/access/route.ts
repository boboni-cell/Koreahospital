import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = db.prepare("SELECT value FROM app_state WHERE key='access_mode'").get() as { value: string } | undefined;
  return NextResponse.json({ mode: row?.value ?? "owner" });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const mode = b.mode === "readonly" ? "readonly" : "owner";
  db.prepare("INSERT INTO app_state (key, value) VALUES ('access_mode', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(mode);
  return NextResponse.json({ ok: true, mode });
}
