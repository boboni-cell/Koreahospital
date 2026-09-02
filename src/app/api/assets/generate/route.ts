import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { generateImage, generateVideo } from "@/lib/image-gen";
import { getMediaModel } from "@/lib/media-models";
import { injectSkillsForTask } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const body = await req.json();
  const kind = body.kind === "video" ? "video" : "image";
  // 检查 media_model 配置；mock 也允许（生成占位）
  getMediaModel(kind);
  let skillContent = "";
  try {
    skillContent = await injectSkillsForTask(
      `生成 ${kind === "image" ? "配图" : "短视频"}：${body.prompt || ""}`,
      { kind, prompt: body.prompt, surgery_type: body.surgery_type, content_id: body.content_id },
      kind === "image" ? ["gbro-cover-design"] : []
    );
  } catch (e) {
    console.warn("[assets/generate] skill 注入跳过", e);
  }
  const enrichedPrompt = skillContent
    ? `${body.prompt}\n\n[专业指引]\n${skillContent.slice(0, 4000)}`
    : `${body.prompt}\n\n医疗合规：毛发移植/植发相关，自然真实，禁止夸大疗效。`;
  try {
    const res = kind === "video"
      ? await generateVideo(enrichedPrompt)
      : await generateImage(enrichedPrompt);
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
    let attachedContentId: number | null = null;
    if (body.content_id) {
      const cid = Number(body.content_id);
      if (Number.isFinite(cid) && cid > 0) {
        db.prepare("UPDATE contents SET cover_url=? WHERE id=?").run(res.url, cid);
        attachedContentId = cid;
      }
    }
    return NextResponse.json({ ok: true, asset: row, attachedContentId });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}
