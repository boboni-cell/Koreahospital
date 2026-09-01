import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";
import { requireAgentPreconditions } from "@/lib/agent-contracts";

export const dynamic = "force-dynamic";

/**
 * PRD §8.5 / §14：人工发布时冻结发布版本快照，并写审计。
 * - publisher 角色前置：必须有已批准内容可发
 * - 调用方传 variant_id 或 content_id（兼容）
 * - 首次发布时 INSERT publish_snapshots；后续重发不覆盖
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contentId = Number(id);
  if (!contentId) return NextResponse.json({ error: "缺 id" }, { status: 400 });

  const pre = requireAgentPreconditions("publisher");
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  const content = db.prepare("SELECT * FROM contents WHERE id=?").get(contentId) as
    | { id: number; status: string; title: string; body: string; platform: string | null; published_at: string | null }
    | undefined;
  if (!content) return NextResponse.json({ error: "内容不存在" }, { status: 404 });
  if (content.status === "published" && content.published_at) {
    return NextResponse.json({ error: "已发布，禁止重复发布", published_at: content.published_at }, { status: 409 });
  }
  // mock 来源的内容必须先经人工二次编辑（needs_human_review=1）才能进发布
  const fullRow = db.prepare("SELECT needs_human_review FROM contents WHERE id=?").get(contentId) as { needs_human_review: number | null } | undefined;
  if (fullRow?.needs_human_review) {
    return NextResponse.json({ error: "该内容由 mock/AI 生成，必须经人工编辑并清除 needs_human_review 标记后才能发布" }, { status: 412 });
  }

  // 关联 variant（如有）
  const variant = db.prepare("SELECT id FROM content_variants WHERE brief_id=? OR id=? ORDER BY id ASC LIMIT 1").get(contentId, contentId) as
    | { id: number }
    | undefined;

  const assetsJson = JSON.stringify(
    db.prepare("SELECT id, filename, file_url, r2_key, license FROM assets ORDER BY id DESC LIMIT 20").all()
  );
  const skills = (req.headers.get("x-active-skills") || "").slice(0, 500);

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare("UPDATE contents SET status='published', published_at=? WHERE id=?").run(now, contentId);
    if (variant) {
      db.prepare(
        "INSERT INTO publish_snapshots (variant_id, content_version, content, assets, model, skills, review_result, platform, account_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        variant.id,
        1,
        JSON.stringify({ title: content.title, body: content.body }),
        assetsJson,
        "manual-mark",
        skills || "manual",
        "human_approved",
        content.platform || "unknown",
        "manual"
      );
    }
  });
  tx();

  recordAction({
    objectType: "content",
    objectId: contentId,
    action: "publish.freeze_snapshot",
    fromStatus: "approved",
    toStatus: "published",
    detail: variant ? `variant#${variant.id}` : "no variant",
  });

  return NextResponse.json({ ok: true, id: contentId, published_at: now, snapshot: Boolean(variant) });
}