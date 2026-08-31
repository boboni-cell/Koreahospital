import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

export async function GET() {
  const pid = getCurrentProjectId();
  const rows = db
    .prepare("SELECT * FROM assets WHERE project_id=? ORDER BY id DESC LIMIT 100")
    .all(pid);
  return NextResponse.json(rows);
}
