import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const variantId = Number(req.nextUrl.searchParams.get("variant_id"));
  if (!variantId) return NextResponse.json({ error: "缺 variant_id" }, { status: 400 });
  const rows = db.prepare("SELECT * FROM publish_snapshots WHERE variant_id=? ORDER BY id DESC").all(variantId);
  return NextResponse.json(rows);
}

/** Publisher 生成可复制发布包并冻结快照；不触发任何自动发布。 */
export async function POST(req: NextRequest) {
  const b = await req.json();
  const variantId = Number(b.variant_id);
  if (!variantId) return NextResponse.json({ error: "缺 variant_id" }, { status: 400 });

  const variant = db.prepare("SELECT * FROM content_variants WHERE id=?").get(variantId) as any;
  if (!variant) return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  if (variant.workflow_status !== "approved") {
    return NextResponse.json({ error: "仅批准过的版本可生成发布包（当前 " + variant.workflow_status + "）" }, { status: 400 });
  }

  const brief = db.prepare("SELECT * FROM content_briefs WHERE id=?").get(variant.brief_id) as any;
  const account = variant.account_id ? db.prepare("SELECT * FROM accounts WHERE id=?").get(variant.account_id) as any : null;
  const review = db.prepare("SELECT * FROM reviews WHERE variant_id=? ORDER BY id DESC LIMIT 1").get(variantId) as any;
  const verCount = (db.prepare("SELECT COUNT(*) AS n FROM variant_versions WHERE variant_id=?").get(variantId) as { n: number }).n;

  const packageText = [
    "# 发布包（人工复制粘贴发布，不自动发布）",
    "平台：" + (variant.platform ?? "—"),
    "账号：" + (account?.handle ?? "—"),
    "版本：" + verCount,
    "标题：" + (brief?.title ?? "—"),
    "",
    "## 正文 / 脚本",
    (variant.content ?? "—"),
    "",
    "## 发布前检查",
    "- 合规：AI 审核通过（" + (review?.result ?? "—") + "），且经人工批准",
    "- 素材：确认已授权（未授权敏感素材不可用）",
    "- 时间：按排期发布，错峰",
  ].join("\n");

  const info = db
    .prepare("INSERT INTO publish_snapshots (variant_id, content_version, content, assets, model, skills, review_result, platform, account_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(variantId, verCount, variant.content, null, null, null, review?.result ?? null, variant.platform ?? null, account?.handle ?? null);

  recordAction({ objectType: "publish_snapshot", objectId: Number(info.lastInsertRowid), action: "publish_snapshot.create", detail: `发布包 #${info.lastInsertRowid} (v${verCount})，人工复制发布` });

  return NextResponse.json({ id: info.lastInsertRowid, content_version: verCount, package: packageText });
}
