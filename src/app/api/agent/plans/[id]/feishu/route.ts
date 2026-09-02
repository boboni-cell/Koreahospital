import { NextResponse } from "next/server";
import db from "@/lib/db";
import { createFeishuDoc } from "@/lib/feishu";
import { getCurrentProjectId } from "@/lib/projects";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const plan = db.prepare("SELECT * FROM agent_plans WHERE id=? AND project_id=?").get(id, getCurrentProjectId()) as any;
  if (!plan) return NextResponse.json({ error: "执行计划不存在" }, { status: 404 });
  if (plan.status !== "completed") return NextResponse.json({ error: "计划尚未完成" }, { status: 409 });
  let steps: any[] = [];
  try { steps = JSON.parse(plan.steps_json || "[]"); } catch {}
  const lines = [`# 研究结果｜执行计划 #${id}`, "", `任务：${plan.task}`, plan.note ? `说明：${plan.note}` : "", ""];
  for (const [index, step] of steps.entries()) {
    lines.push(`## ${index + 1}. ${step.text}`, "", `负责人：${step.role}`, "", step.result || "（无文本产出）", "");
    if (step.sources?.length) lines.push("### 来源", "", ...step.sources.map((source: string) => `- ${source}`), "");
  }
  try {
    const doc = await createFeishuDoc(`研究结果-${plan.task.slice(0, 30)}`, lines.filter(Boolean).join("\n"));
    return NextResponse.json({ ok: true, docUrl: doc.url });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 502 });
  }
}
