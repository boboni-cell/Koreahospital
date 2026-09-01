import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { chatCompleteForAgent } from "@/lib/agent-llm";
import { requireAgentPreconditions } from "@/lib/agent-contracts";
import { getAgentModel } from "@/lib/agent-models";

export const dynamic = "force-dynamic";

/**
 * G2 执行器：跑 plan 里第 idx 个 step。
 * ponytail: 执行器只跑对应 role 的 LLM，把 step.text 当 prompt，输出落到 step.result；
 * 不会自动写库到 contents/contents.body 等业务表——那是 v2 的事。
 * 这样既真跑了 LLM(可验证执行链路通了),又不偷偷改业务数据。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const idx = Number(b.step_index);
  if (!Number.isFinite(idx) || idx < 0) return NextResponse.json({ error: "缺 step_index" }, { status: 400 });

  const row = db.prepare("SELECT * FROM agent_plans WHERE id=?").get(id) as any;
  if (!row) return NextResponse.json({ error: "plan 不存在" }, { status: 404 });

  let steps: any[];
  try { steps = JSON.parse(row.steps_json || "[]"); } catch { steps = []; }
  const step = steps[idx];
  if (!step) return NextResponse.json({ error: "step 不存在" }, { status: 404 });
  if (step.status === "running") return NextResponse.json({ error: "该 step 已在执行" }, { status: 409 });
  if (step.status === "done") return NextResponse.json({ error: "该 step 已完成,无需重复" }, { status: 409 });

  const pre = requireAgentPreconditions(step.role);
  if (!pre.ok) return NextResponse.json({ error: pre.reason }, { status: 412 });

  // 标 running
  step.status = "running";
  step.started_at = new Date().toISOString();
  db.prepare("UPDATE agent_plans SET steps_json=?, status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), id);

  try {
    const t0 = Date.now();
    const out = await chatCompleteForAgent(
      step.role,
      [
        { role: "system", content: `你是 plan 中第 ${idx + 1} 步的执行者。任务来自上层 plan：「${row.task.slice(0, 200)}」。请直接产出本步的产出物,不要寒暄,不要解释步骤编号。` },
        { role: "user", content: String(step.text) },
      ],
      { maxTokens: 600, timeoutMs: 60000 }
    );
    const latencyMs = Date.now() - t0;
    const m = getAgentModel(step.role as any);
    step.status = "done";
    step.result = out.slice(0, 4000);
    step.completed_at = new Date().toISOString();
    step.meta = {
      provider: m.provider,
      model: m.model,
      latency_ms: latencyMs,
      is_mock: !!m.is_mock,
      key_len: (m.api_key || "").length,
    };
    // 全部完成 → plan.status='completed'，否则 'running'
    const allDone = steps.every((s) => s.status === "done");
    const someFailed = steps.some((s) => s.status === "failed");
    const nextPlanStatus = someFailed ? "partial" : allDone ? "completed" : "running";
    db.prepare("UPDATE agent_plans SET steps_json=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), nextPlanStatus, id);
    return NextResponse.json({ ok: true, step_index: idx, status: step.status, plan_status: nextPlanStatus });
  } catch (e: any) {
    step.status = "failed";
    step.error = (e?.message || String(e)).slice(0, 400);
    step.completed_at = new Date().toISOString();
    db.prepare("UPDATE agent_plans SET steps_json=?, status='partial', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(steps), id);
    return NextResponse.json({ ok: false, step_index: idx, status: "failed", error: step.error }, { status: 502 });
  }
}