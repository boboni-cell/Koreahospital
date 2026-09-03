import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { chubbySkillsConfigured, ingestWithChubbySkills, sourcePlatform, validateChubbySource } from "@/lib/chubby-skills";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const source = String(body.source || body.url || "").trim();
  const sourceError = validateChubbySource(source);
  if (sourceError) return NextResponse.json({ error: sourceError }, { status: 400 });
  if (!chubbySkillsConfigured()) return NextResponse.json({ error: "未配置 CHUBBYSKILLS_DIR，请先部署 ChubbySkills" }, { status: 503 });
  const projectId = getCurrentProjectId();
  const platform = sourcePlatform(source) || "unknown";
  const taskInfo = db.prepare("INSERT INTO research_tasks (project_id, platform, keywords, status, started_at) VALUES (?, ?, ?, 'running', CURRENT_TIMESTAMP)").run(projectId, platform, source);
  const taskId = Number(taskInfo.lastInsertRowid);
  try {
    const material = await ingestWithChubbySkills(source, String(body.fallbackText || ""));
    db.prepare("INSERT INTO research_items (task_id, project_id, platform, external_id, source_url, title, author, published_at, views, likes, saves, comments, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      taskId, projectId, material.platform, material.externalId, material.sourceUrl, material.title, material.author, material.publishedAt,
      material.metrics.views ?? null, material.metrics.likes ?? null, material.metrics.collects ?? null, material.metrics.comments ?? material.metrics.replies ?? null, JSON.stringify(material),
    );
    db.prepare("UPDATE research_tasks SET status='completed', progress=1, total=1, completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(taskId);
    return NextResponse.json({ ok: true, provider: "chubbyskills", taskId, platform: material.platform, title: material.title, readOnly: true });
  } catch (error: any) {
    const message = String(error?.message || error).slice(0, 400);
    db.prepare("UPDATE research_tasks SET status='failed', error=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(message, taskId);
    return NextResponse.json({ error: message, taskId, provider: "chubbyskills", readOnly: true }, { status: 502 });
  }
}
