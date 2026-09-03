import db from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

/** 本地优先：每个项目预留独立工作区，后续可按项目迁移到 R2/D1。 */
export function ensureProjectWorkspace(project: Pick<Project, "id" | "slug" | "name">) {
  const slug = (project.slug || project.name || `project-${project.id}`).replace(/[^a-zA-Z0-9_-]/g, "-");
  const root = path.join(PROJECTS_DIR, `${slug}-${project.id}`);
  for (const dir of ["assets", "accounts", "contents", "research", "reports", "database"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  return root;
}

export interface Project {
  id: number;
  name: string;
  slug: string | null;
  status: string;
  is_default: number;
  marketing_brief: string | null;
  audience: string | null;
  voice: string | null;
  conversion_goal: string | null;
  banned_terms: string | null;
  created_at: string;
  updated_at: string;
}

/** 当前项目 id：取 app_state.current_project_id，缺省回退默认项目。 */
export function getCurrentProjectId(): number {
  const cur = db
    .prepare("SELECT value FROM app_state WHERE key='current_project_id'")
    .get() as { value: string } | undefined;
  if (cur) {
    const id = Number(cur.value);
    if (id > 0) return id;
  }
  const def = db
    .prepare("SELECT id FROM projects WHERE is_default=1 ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;
  return def ? def.id : 1;
}

/** 当前项目对象；找不到时返回第一个项目。 */
export function getCurrentProject(): Project | null {
  const id = getCurrentProjectId();
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(id) as Project | undefined;
  if (p) return p;
  const first = db.prepare("SELECT * FROM projects ORDER BY id LIMIT 1").get() as Project | undefined;
  return first ?? null;
}

/** 列出全部项目，默认项目置顶。 */
export function listProjects(): Project[] {
  return db
    .prepare("SELECT * FROM projects ORDER BY is_default DESC, id ASC")
    .all() as Project[];
}

/** 设置当前项目。 */
export function setCurrentProject(id: number) {
  db.prepare(
    "INSERT INTO app_state (key, value) VALUES ('current_project_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(String(id));
}

/** 更新项目营销简报（Task 04）。 */
export function updateProjectBrief(
  id: number,
  fields: {
    marketing_brief?: string | null;
    audience?: string | null;
    voice?: string | null;
    conversion_goal?: string | null;
    banned_terms?: string | null;
  }
) {
  db.prepare(
    "UPDATE projects SET marketing_brief=?, audience=?, voice=?, conversion_goal=?, banned_terms=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(
    fields.marketing_brief ?? null,
    fields.audience ?? null,
    fields.voice ?? null,
    fields.conversion_goal ?? null,
    fields.banned_terms ?? null,
    id
  );
}
