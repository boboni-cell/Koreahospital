import { NextRequest, NextResponse } from "next/server";
import { getCurrentProject, listProjects, setCurrentProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ projects: listProjects(), current: getCurrentProject() });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.projectId ?? b.id);
  if (!id) return NextResponse.json({ error: "缺 projectId" }, { status: 400 });
  setCurrentProject(id);
  return NextResponse.json({ ok: true, current: getCurrentProject() });
}
