import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { purgeFile } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  db.prepare(
    "UPDATE assets SET surgery_type=?, patient_code=?, license=? WHERE id=?"
  ).run(
    body.surgery_type ?? null,
    body.patient_code ?? null,
    body.license ?? "pending",
    id
  );
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = db.prepare("SELECT r2_key FROM assets WHERE id=?").get(id) as
    | { r2_key: string | null }
    | undefined;
  if (!row) return NextResponse.json({ ok: true, id, deleted: false });

  // 先删物理文件（本地 + R2 同步），再删记录，保证不残留孤儿文件
  await purgeFile(row.r2_key ?? null);
  db.prepare("DELETE FROM assets WHERE id=?").run(id);
  return NextResponse.json({ ok: true, id, deleted: true });
}
