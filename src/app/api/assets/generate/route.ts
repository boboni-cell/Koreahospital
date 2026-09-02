import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { generateImage, generateVideo } from "@/lib/image-gen";
import { getMediaModel } from "@/lib/media-models";
import { injectSkillsForTask } from "@/lib/skills";
import {
  buildVideoSegmentPrompts,
  getMediaRequest,
  updateMediaRequest,
  appendMediaRequestRound,
} from "@/lib/media-requests";
import { hasFFmpeg, stitchVideos, saveVideoBytes } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

interface GenerateBody {
  kind: "image" | "video";
  prompt?: string;
  filename?: string;
  category?: string;
  surgery_type?: string | null;
  patient_code?: string | null;
  content_id?: number | null;
  media_request_id?: number | null;
  ratio?: string;
  style?: string;
  scene?: string;
  usage?: string;
  duration?: string | number;
  resolution?: string;
  storyboard?: string;
  bgm?: string;
  split?: boolean;
}

function insertAsset(projectId: number, body: GenerateBody, res: { url: string; file_type: string; stored: string | null }, kind: "image" | "video") {
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
  return db.prepare("SELECT * FROM assets WHERE id=?").get(info.lastInsertRowid) as any;
}

function attachToContent(assetId: number, contentId: number | null | undefined, projectId: number, kind: "image" | "video", url: string) {
  if (!contentId) return null;
  const cid = Number(contentId);
  if (!Number.isFinite(cid) || cid <= 0) return null;
  const content = db.prepare("SELECT cover_url, media_urls FROM contents WHERE id=? AND project_id=?").get(cid, projectId) as { cover_url: string | null; media_urls: string | null } | undefined;
  if (!content) return null;
  let media: { type: "image" | "video"; url: string }[] = [];
  try { media = JSON.parse(content.media_urls || "[]"); } catch { media = []; }
  if (!media.some((item) => item.url === url)) media.push({ type: kind, url });
  db.prepare("UPDATE contents SET cover_url=CASE WHEN ?='image' AND (cover_url IS NULL OR cover_url='') THEN ? ELSE cover_url END, media_urls=? WHERE id=?")
    .run(kind, url, JSON.stringify(media.slice(0, 8)), cid);
  db.prepare("INSERT INTO asset_usage (asset_id, content_id) VALUES (?, ?)").run(assetId, cid);
  return cid;
}

export async function POST(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const body = (await req.json()) as GenerateBody;
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

  const mediaRequestId = body.media_request_id ? Number(body.media_request_id) : null;
  const segments: { index: number; label: string; prompt: string; assetId: number | null; url: string | null; error?: string }[] = [];
  let assetIds: number[] = [];
  let attachedContentId: number | null = null;

  try {
    if (mediaRequestId && getMediaRequest(mediaRequestId)) {
      updateMediaRequest(mediaRequestId, { status: "generating" });
      appendMediaRequestRound(mediaRequestId, {
        phase: "generation_started",
        note: `后台开始生成 ${kind === "video" ? "视频" : "配图"}`,
      });
    }

    if (kind === "image") {
      const res = await generateImage(enrichedPrompt);
      const asset = insertAsset(projectId, body, res, "image");
      assetIds.push(asset.id);
      attachedContentId = attachToContent(asset.id, body.content_id, projectId, "image", res.url);
      if (mediaRequestId) {
        updateMediaRequest(mediaRequestId, { status: "done", assetIds });
      }
      return NextResponse.json({ ok: true, asset, assets: [asset], segments: [], attachedContentId, mediaRequestId, assetIds });
    }

    // ===== 视频：超过 15 秒自动拆段生成（每段可独立生成，之后按顺序剪辑） =====
    const durationNum = Number(body.duration || 0);
    const { split, segments: planned } = buildVideoSegmentPrompts({
      prompt: body.prompt || "",
      storyboard: body.storyboard || "",
      duration: durationNum,
      ratio: body.ratio,
      style: body.style,
      scene: body.scene,
      bgm: body.bgm,
      resolution: body.resolution,
    });

    const plans = body.split === false ? [{ index: 1, label: "整段", prompt: body.prompt || "" }] : planned;
    if (plans.length === 0) throw new Error("没有可生成的视频提示词");

    for (const seg of plans) {
      try {
        const segPrompt = body.split === false ? enrichedPrompt : `${enrichedPrompt}\n\n${seg.prompt}`;
        const res = await generateVideo(segPrompt);
        const asset = insertAsset(projectId, { ...body, filename: `${body.filename || "视频"}-${Date.now()}-seg${seg.index}` }, res, "video");
        assetIds.push(asset.id);
        const cid = attachToContent(asset.id, body.content_id, projectId, "video", res.url);
        if (cid) attachedContentId = cid;
        segments.push({ index: seg.index, label: seg.label, prompt: seg.prompt, assetId: asset.id, url: res.url });
      } catch (e) {
        segments.push({ index: seg.index, label: seg.label, prompt: seg.prompt, assetId: null, url: null, error: String((e as Error)?.message || e).slice(0, 200) });
        throw e;
      }
    }

    const first = segments.find((s) => s.assetId) ? db.prepare("SELECT * FROM assets WHERE id=?").get(segments.find((s) => s.assetId)!.assetId) as any : null;

    // ffmpeg 自动拼接：多段视频按顺序合成一个成品，失败不影响分段素材
    let stitchedAsset: any = null;
    let stitchError = "";
    const remoteUrls = segments.filter((s) => s.url && /^https?:\/\//i.test(s.url!)).map((s) => s.url!) as string[];
    if (remoteUrls.length > 1 && (await hasFFmpeg())) {
      try {
        const bytes = await stitchVideos(remoteUrls);
        const saved = await saveVideoBytes(bytes, "mp4");
        stitchedAsset = insertAsset(
          projectId,
          { ...body, filename: `${body.filename || "视频"}-${Date.now()}-stitched` },
          { url: saved.url, file_type: "video", stored: saved.stored },
          "video"
        );
        assetIds.push(stitchedAsset.id);
        const cid = attachToContent(stitchedAsset.id, body.content_id, projectId, "video", saved.url);
        if (cid) attachedContentId = cid;
      } catch (e) {
        stitchError = String((e as Error)?.message || e).slice(0, 200);
      }
    } else if (remoteUrls.length > 1) {
      stitchError = "ffmpeg 不可用，已保留分段素材";
    }

    if (mediaRequestId) {
      updateMediaRequest(mediaRequestId, { status: "done", assetIds });
      appendMediaRequestRound(mediaRequestId, {
        phase: "generation_done",
        note: `视频${split ? "已拆段生成 " + segments.length + " 段" : "已生成"}${stitchedAsset ? "，已自动拼接为一个成品" : stitchError ? `，${stitchError}` : ""}，素材已入库`,
      });
    }
    const allAssets = [
      ...segments.filter((s) => s.assetId).map((s) => db.prepare("SELECT * FROM assets WHERE id=?").get(s.assetId)),
      ...(stitchedAsset ? [stitchedAsset] : []),
    ];
    return NextResponse.json({ ok: true, asset: stitchedAsset ?? first, assets: allAssets, segments, stitched: stitchedAsset, stitchError: stitchError || null, attachedContentId, mediaRequestId, assetIds, split });
  } catch (e) {
    if (mediaRequestId && getMediaRequest(mediaRequestId)) {
      updateMediaRequest(mediaRequestId, { status: "failed", assetIds });
      appendMediaRequestRound(mediaRequestId, {
        phase: "generation_failed",
        note: String((e as Error)?.message || e).slice(0, 240),
      });
    }
    return NextResponse.json({ error: String(e).slice(0, 300), segments: segments.filter((s) => s.url) }, { status: 502 });
  }
}
