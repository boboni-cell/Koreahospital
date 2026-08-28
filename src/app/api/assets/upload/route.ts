import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const info = db
    .prepare(
      "INSERT INTO assets (filename, file_url, file_type, surgery_type, patient_code, license) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      body.filename ?? "未命名",
      body.file_url ?? null,
      body.file_type ?? "image",
      body.surgery_type ?? null,
      body.patient_code ?? null,
      body.license ?? "pending"
    );
  return NextResponse.json({ id: info.lastInsertRowid });
}
