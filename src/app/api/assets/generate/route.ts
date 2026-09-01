import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { generateImage, generateVideo } from "@/lib/image-gen";
import { getMediaModel } from "@/lib/media-models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const body = await req.json();
  const kind = body.kind === "video" ? "video" : "image";
  // 检查 media_model 配置；mock 也允许（生成占位）
  getMediaModel(kind);
  try {
    const res = kind === "video"
      ? await generateVideo(body.prompt)
      : await generateImage(body.prompt);
    const info = db
      .prepare(
        "INSERT INTO assets (filename, file_url, r2_key, file_type, category, surgery_type, patient_code, license, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        body.filename || `${kind === "video" ? "视频" : "配图"}-${Date.now()}`,
        res.url,
        res.stored,
        res.file_type,
        body.category || (kind === "video" ? "宣传物料" : "科普图示"),
        body.surgery_type || null,
        body.patient_code || null,
        "pending",
        projectId
      );
    const row = db.prepare("SELECT * FROM assets WHERE id=?").get(info.lastInsertRowid);
    return NextResponse.json({ ok: true, asset: row });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}