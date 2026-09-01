import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import {
  ensureUploadDir,
  localPublicPath,
  localAbsPath,
  safeFileName,
  pushToR2,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  const projectId = getCurrentProjectId();
  await ensureUploadDir();
  const form = await req.formData();
  const file = form.get("file");
  const surgeryType = (form.get("surgery_type") as string) || null;
  const patientCode = (form.get("patient_code") as string) || null;
  const license = (form.get("license") as string) || "pending";
  const category = (form.get("category") as string) || "未分类";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const original = file.name || "未命名";
  const stored = safeFileName(original);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(localAbsPath(stored), buf);

  // 若已接入 R2，则同步上传并优先用 R2 公开 URL；否则用本地静态路径
  const r2Url = await pushToR2(localAbsPath(stored), stored);
  const fileUrl = r2Url ?? localPublicPath(stored);

  const mime = file.type || "";
  const fileType = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
    ? "video"
    : "doc";

  const info = db
    .prepare(
      "INSERT INTO assets (filename, file_url, r2_key, file_type, category, file_size, surgery_type, patient_code, license, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      original,
      fileUrl,
      stored, // 本地阶段 r2_key 即文件名，后续迁移 R2 时直接复用
      fileType,
      category,
      file.size,
      surgeryType,
      patientCode,
      license,
      projectId
    );

  const row = db.prepare("SELECT * FROM assets WHERE id=?").get(info.lastInsertRowid);
  return NextResponse.json({ id: info.lastInsertRowid, asset: row });
}
