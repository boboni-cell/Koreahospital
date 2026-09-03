import { NextRequest, NextResponse } from "next/server";
import { getCurrentProject, listProjects, setCurrentProject } from "@/lib/projects";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ projects: listProjects(), current: getCurrentProject() });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.action === "create") {
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "缺项目名称" }, { status: 400 });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `project-${Date.now()}`;
    const info = db.prepare("INSERT INTO projects (name, slug, status, is_default, created_at, updated_at) VALUES (?, ?, 'active', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run(name, slug);
    setCurrentProject(Number(info.lastInsertRowid));
    return NextResponse.json({ ok: true, current: getCurrentProject() });
  }
  const id = Number(b.projectId ?? b.id);
  if (!id) return NextResponse.json({ error: "缺 projectId" }, { status: 400 });
  setCurrentProject(id);
  return NextResponse.json({ ok: true, current: getCurrentProject() });
}
