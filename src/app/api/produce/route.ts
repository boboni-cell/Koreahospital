import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProject, getCurrentProjectId } from "@/lib/projects";
import { getProjectContext } from "@/lib/project-context";
import { recordAction } from "@/lib/workflow-actions";
import { listSkills, resolveContents } from "@/lib/skills";

export const dynamic = "force-dynamic";

/** 小红书生产流：母版简报 -> 结构化内容 -> ai_review */
function xhsBlueprint(brief: any, account: any, skillsText: string, ctx: string): string {
  const title = brief.title || "未命名";
  const body = [
    "# 标题",
    title,
    "",
    "# 正文",
    "【开头钩子】" + (brief.audience ? "针对" + brief.audience + "的痛点问题。" : "先抛一个高频痛点。"),
    "【正文】" + (brief.facts || "（无事实，需补医疗依据，禁止虚构）"),
    "【结尾】引导评论区提问，私信获取更详细方案。",
    "",
    "# 结构（爆款结构库）",
    "痛点 → 方案 → 证据/案例 → CTA",
    "",
    "# CTA",
    "“有问题欢迎评论/私信，1v1 帮你评估。”",
    "",
    "# 评论引导",
    "置顶“你最想了解发际线种植的哪一步？”",
    "",
    "# 素材计划",
    "封面：院长出镜/案例图（需授权）；正文图：术前术后对比（授权留档）、科普图示。",
    "",
    "---",
    "⚠️ 合规：不使用绝对化用语；患者素材需授权；AI 不直接发布。",
    "",
    "（Skill 参考：）",
    skillsText.slice(0, 500),
  ].join("\n");
  return body;
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const variantId = Number(b.variant_id);
  if (!variantId) return NextResponse.json({ error: "缺 variant_id" }, { status: 400 });
  const pid = getCurrentProjectId();
  const project = getCurrentProject();

  const variant = db.prepare("SELECT * FROM content_variants WHERE id=?").get(variantId) as any;
  if (!variant) return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  const brief = db.prepare("SELECT * FROM content_briefs WHERE id=?").get(variant.brief_id) as any;
  const account = variant.account_id ? db.prepare("SELECT * FROM accounts WHERE id=?").get(variant.account_id) as any : null;

  const skills = await listSkills();
  const cat = await resolveContents(skills.map((s: any) => s.id).filter((id: string) => id.includes("xhs") || id.includes("xiaohongshu") || id.includes("medical")));
  const ctx = getProjectContext();
  const content = xhsBlueprint(brief ?? {}, account ?? {}, cat, ctx);

  db.prepare("UPDATE content_variants SET content=?, workflow_status='ai_review' WHERE id=?").run(content, variantId);
  recordAction({ objectType: "content_variant", objectId: variantId, action: "produce.xiaohongshu", detail: `小红书生产流生成 (v${variantId})` });

  return NextResponse.json({ ok: true, id: variantId, workflow_status: "ai_review", content });
}
