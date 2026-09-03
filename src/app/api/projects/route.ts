import { NextRequest, NextResponse } from "next/server";
import { getCurrentProject, listProjects, setCurrentProject, ensureProjectWorkspace, PROJECTS_DIR } from "@/lib/projects";
import db from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = listProjects();
  for (const project of projects) ensureProjectWorkspace(project);
  return NextResponse.json({ projects, current: getCurrentProject(), storage: { type: "local", r2: false, d1: false } });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.action === "create") {
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "缺项目名称" }, { status: 400 });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `project-${Date.now()}`;
    const info = db.prepare("INSERT INTO projects (name, slug, status, is_default, created_at, updated_at) VALUES (?, ?, 'active', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run(name, slug);
    const created = db.prepare("SELECT id, name, slug FROM projects WHERE id=?").get(Number(info.lastInsertRowid)) as any;
    ensureProjectWorkspace(created);
    setCurrentProject(Number(info.lastInsertRowid));
    return NextResponse.json({ ok: true, current: getCurrentProject() });
  }
  const id = Number(b.projectId ?? b.id);
  if (!id) return NextResponse.json({ error: "缺 projectId" }, { status: 400 });
  setCurrentProject(id);
  return NextResponse.json({ ok: true, current: getCurrentProject() });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const confirmName = req.nextUrl.searchParams.get("confirm") || "";
  const project = db.prepare("SELECT * FROM projects WHERE id=?").get(id) as any;
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const projectCount = (db.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }).count;
  if (projectCount <= 1) return NextResponse.json({ error: "至少保留一个项目，未删除" }, { status: 400 });
  if (confirmName !== project.name) return NextResponse.json({ error: "确认名称不匹配，未删除" }, { status: 400 });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
  const tx = db.transaction(() => {
    for (const { name } of tables) {
      const columns = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[];
      if (columns.some((column) => column.name === "project_id")) db.prepare(`DELETE FROM "${name}" WHERE project_id=?`).run(id);
    }
    db.prepare("DELETE FROM projects WHERE id=?").run(id);
  });
  tx();
  const slug = (project.slug || project.name || `project-${id}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  fs.rmSync(path.join(PROJECTS_DIR, `${slug}-${id}`), { recursive: true, force: true });
  const next = db.prepare("SELECT id FROM projects ORDER BY is_default DESC, id ASC LIMIT 1").get() as { id: number } | undefined;
  if (next) setCurrentProject(next.id);
  return NextResponse.json({ ok: true, deletedProjectId: id, current: getCurrentProject() });
}
