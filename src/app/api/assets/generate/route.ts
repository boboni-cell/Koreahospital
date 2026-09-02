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
        const content = db.prepare("SELECT media_urls FROM contents WHERE id=? AND project_id=?").get(cid, projectId) as { media_urls: string | null } | undefined;
        if (content) {
          let media: { type: "image" | "video"; url: string }[] = [];
          try { media = JSON.parse(content.media_urls || "[]"); } catch {}
          if (!media.some((item) => item.url === res.url)) media.push({ type: kind, url: res.url });
          db.prepare("UPDATE contents SET cover_url=CASE WHEN ?='image' AND (cover_url IS NULL OR cover_url='') THEN ? ELSE cover_url END, media_urls=? WHERE id=?")
            .run(kind, res.url, JSON.stringify(media.slice(0, 8)), cid);
          db.prepare("INSERT INTO asset_usage (asset_id, content_id) VALUES (?, ?)").run(info.lastInsertRowid, cid);
        }
        attachedContentId = cid;
      }
    }
    return NextResponse.json({ ok: true, asset: row, attachedContentId });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}
