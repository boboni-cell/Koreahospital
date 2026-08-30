import { NextRequest, NextResponse } from "next/server";
import { listSkills, catalog, selectSkillIds, resolveContents } from "@/lib/skills";

export const dynamic = "force-dynamic";

/**
 * Q2=a：前端每次生成前只调一次这个端点。
 * 返回：本任务需注入的 skill 正文（混合：always 静态 + dynamic 由模型挑），可缓存的目录元信息。
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = body.task || ""; // 如 "生成文案" / "选题研究" / "数据日报"
  const input = body.input || {};

  const all = await listSkills();
  if (all.length === 0) {
    // 没放 skill：直接返回空，不影响原有生成流程（0 额外 token）
    return NextResponse.json({ ids: [], content: "", catalog: [], modelPowered: true });
  }

  const { ids, modelPowered } = await selectSkillIds(task, input);
  const content = await resolveContents(ids);
  const cat = catalog(all);

  return NextResponse.json({ ids, content, catalog: cat, modelPowered });
}

/** 给「模型管理」/调试用：看目前仓库里有哪些 skill */
export async function GET() {
  const all = await listSkills();
  return NextResponse.json(catalog(all));
}
