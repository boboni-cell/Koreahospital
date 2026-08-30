import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getActive } from "@/lib/models";
import { generateImage, generateVideo } from "@/lib/image-gen";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const kind = body.kind === "video" ? "video" : "image";
  const m = await getActive(kind);
  if (!m) {
    return NextResponse.json(
      { error: `没有启用中的${kind === "video" ? "视频" : "图像"}模型，请先在「模型管理」添加并激活` },
      { status: 400 }
    );
  }
  try {
    const res = kind === "video"
      ? await generateVideo(m, body.prompt)
      : await generateImage(m, body.prompt);
    const info = db
      .prepare(
        "INSERT INTO assets (filename, file_url, r2_key, file_type, category, surgery_type, patient_code, license) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        body.filename || `${kind === "video" ? "视频" : "配图"}-${Date.now()}`,
        res.url,
        res.stored,
        res.file_type,
        body.category || (kind === "video" ? "宣传物料" : "科普图示"),
        body.surgery_type || null,
        body.patient_code || null,
        "pending"
      );
    const row = db.prepare("SELECT * FROM assets WHERE id=?").get(info.lastInsertRowid);
    return NextResponse.json({ ok: true, asset: row });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}
