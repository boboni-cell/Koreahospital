import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  db.prepare("UPDATE tasks SET status=?, due=?, assignee=? WHERE id=?").run(
    body.status ?? "todo",
    body.due ?? null,
    body.assignee ?? null,
    id
  );
  return NextResponse.json({ ok: true, id });
}
