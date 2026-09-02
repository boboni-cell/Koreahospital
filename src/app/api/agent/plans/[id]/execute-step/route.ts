import { NextRequest, NextResponse } from "next/server";
import { runPlanStep } from "@/lib/agent-plan-executor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const idx = Number(body.step_index);
  if (!Number.isInteger(idx) || idx < 0) return NextResponse.json({ error: "缺少有效的步骤编号" }, { status: 400 });
  try {
    const result = await runPlanStep(Number(id), idx);
    return NextResponse.json({ ok: true, step_index: idx, status: result.step.status, plan_status: result.planStatus });
  } catch (error: any) {
    const message = String(error?.message || error);
    const status = message.includes("不存在") ? 404 : message.includes("正在执行") ? 409 : 502;
    return NextResponse.json({ ok: false, step_index: idx, status: "failed", error: message }, { status });
  }
}
