import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProject } from "@/lib/projects";
import { recordAction } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

const ABSOLUTE_WORDS = ["最佳", "首选", "保证", "100%", "100%成功", "治愈", "根治", "无风险", "绝对", "最先进", "永久", "零风险"];

function runAiReview(content: string, bannedTerms: string | null): { result: string; reasons: string[] } {
  // 排除模板生成的合规免责段落，只审核对外正文
  const text = (content || "")
    .split(/\r?\n/)
    .filter((line) => !/^---/.test(line.trim()) && !/⚠️ 合规/.test(line))
    .join("\n");
  const reasons: string[] = [];

  // 禁区词
  const banned = (bannedTerms || "")
    .split(/[，、,;；;\n\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const hitBanned = banned.filter((w) => text.includes(w));
  if (hitBanned.length) {
    return { result: "forbidden", reasons: ["命中禁区词：" + hitBanned.join("、")] };
  }

  // 绝对化用语
  const hitAbs = ABSOLUTE_WORDS.filter((w) => text.includes(w));
  if (hitAbs.length) {
    return { result: "high_risk_needs_evidence", reasons: ["绝对化/承诺性表述：" + hitAbs.join("、") + "，需提供证据或改写"] };
  }

  // 患者敏感信息未授权
  if (/患者|病例|术前|术后|对比/.test(text) && !/授权|合规/.test(text)) {
    reasons.push("涉及患者/案例表述，需确认授权留档");
  }

  if (!text.trim()) return { result: "needs_change", reasons: ["内容为空，无法审核"] };

  if (reasons.length) return { result: "needs_change", reasons };
  return { result: "submit", reasons: ["未命中明显红线"] };
}

export async function GET(req: NextRequest) {
  const variantId = Number(req.nextUrl.searchParams.get("variant_id"));
  if (!variantId) return NextResponse.json({ error: "缺 variant_id" }, { status: 400 });
  const rows = db.prepare("SELECT * FROM reviews WHERE variant_id=? ORDER BY id DESC").all(variantId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const variantId = Number(b.variant_id);
  if (!variantId) return NextResponse.json({ error: "缺 variant_id" }, { status: 400 });
  const type = b.reviewer_type === "human" ? "human" : "ai";

  const variant = db.prepare("SELECT * FROM content_variants WHERE id=?").get(variantId) as { content: string | null } | undefined;
  const project = getCurrentProject();

  let result = b.result as string | undefined;
  let reasons = b.reasons as string | undefined;

  if (type === "ai") {
    const ai = runAiReview(variant?.content ?? "", project?.banned_terms ?? null);
    result = ai.result;
    reasons = ai.reasons.join("；");
  }
  if (!result) return NextResponse.json({ error: "缺 result" }, { status: 400 });

  const payload = {
    submit: "human_review",
    needs_change: "ai_review",
    high_risk_needs_evidence: "blocked",
    forbidden: "blocked",
    approve: "approved",
    reject: "rejected",
  } as Record<string, string>;
  const nextStatus = payload[result] ?? "ai_review";
  db.prepare("UPDATE content_variants SET workflow_status=? WHERE id=?").run(nextStatus, variantId);
  const info = db.prepare("INSERT INTO reviews (variant_id, reviewer_type, result, reasons, evidence) VALUES (?, ?, ?, ?, ?)").run(variantId, type, result, reasons ?? null, b.evidence ?? null);
  recordAction({ objectType: "content_variant", objectId: variantId, action: "review." + result, detail: `[${type}] 审核 #${variantId} → ${result}` });

  return NextResponse.json({ id: info.lastInsertRowid, result, nextStatus });
}
