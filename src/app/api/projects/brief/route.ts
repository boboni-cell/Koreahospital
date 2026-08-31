import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProject, updateProjectBrief } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = getCurrentProject();
  const pid = project?.id ?? 1;
  const accounts = db
    .prepare(
      "SELECT a.id, a.platform, a.handle, a.role, a.positioning, a.environment_status, a.followers, o.name AS operator_name FROM accounts a LEFT JOIN operators o ON o.id=a.operator_id WHERE a.project_id=? ORDER BY a.platform, a.id"
    )
    .all(pid) as {
    id: number; platform: string; handle: string; role: string | null;
    positioning: string | null; environment_status: string | null; followers: number; operator_name: string | null;
  }[];
  const pillars = db
    .prepare("SELECT * FROM content_pillars WHERE project_id=? ORDER BY id ASC")
    .all(pid);
  const platformSplit = accounts.reduce<Record<string, typeof accounts>>((m, a) => {
    (m[a.platform] ??= []).push(a);
    return m;
  }, {});
  return NextResponse.json({ project, accounts, pillars, platformSplit });
}

export async function PUT(req: NextRequest) {
  const project = getCurrentProject();
  if (!project) return NextResponse.json({ error: "无当前项目" }, { status: 400 });
  const b = await req.json();
  updateProjectBrief(project.id, {
    marketing_brief: b.marketing_brief ?? null,
    audience: b.audience ?? null,
    voice: b.voice ?? null,
    conversion_goal: b.conversion_goal ?? null,
    banned_terms: b.banned_terms ?? null,
  });
  return NextResponse.json({ ok: true, project: getCurrentProject() });
}
