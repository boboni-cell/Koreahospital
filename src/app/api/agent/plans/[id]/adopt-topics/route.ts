import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { parseAdoptedTopics } from "@/lib/topic-adoption";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = getCurrentProjectId();
  const plan = db.prepare("SELECT steps_json, status FROM agent_plans WHERE id=? AND project_id=?").get(Number(id), pid) as { steps_json: string; status: string } | undefined;
  if (!plan) return NextResponse.json({ error: "执行计划不存在" }, { status: 404 });
  let steps: any[] = [];
  try { steps = JSON.parse(plan.steps_json || "[]"); } catch { /* 空计划 */ }
  const candidates = steps.filter((step) => step.status === "done" && step.result).map((step) => String(step.result)).filter((text) => /选题\s*\d+|选题\s*ID/.test(text));
  const topics = candidates.flatMap((result) => parseAdoptedTopics(result)).slice(0, 20);
  if (!topics.length) return NextResponse.json({ error: "未能解析出有效选题，请先检查总编产出" }, { status: 400 });
  const existing = db.prepare("SELECT id FROM topics WHERE project_id=? AND source=? ORDER BY id").all(pid, `plan:${id}`) as { id: number }[];
  if (existing.length) return NextResponse.json({ ok: true, count: existing.length, ids: existing.map((topic) => topic.id), alreadyAdopted: true });
  const insert = db.prepare("INSERT INTO topics (title, description, source, heat_score, project_id) VALUES (?, ?, ?, ?, ?)");
  const ids = db.transaction(() => topics.map((topic) => insert.run(topic.title, topic.description, `plan:${id}`, topic.heat, pid).lastInsertRowid))();
  return NextResponse.json({ ok: true, count: ids.length, ids });
}
