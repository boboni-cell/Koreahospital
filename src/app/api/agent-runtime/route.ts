import { NextRequest, NextResponse } from "next/server";
import { getAgentRuntime, getCodexStatus, publicAgentRuntime, runLocalCodex, runOpenAiApi, updateAgentRuntime } from "@/lib/agent-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getAgentRuntime();
  return NextResponse.json({ runtime: publicAgentRuntime(config), codex: await getCodexStatus() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const current = getAgentRuntime();
  const next = updateAgentRuntime({
    mode: body.mode,
    model: body.model,
    base_url: body.baseUrl,
    api_key: body.apiKey === undefined ? current.api_key : String(body.apiKey),
  });
  return NextResponse.json({ ok: true, runtime: publicAgentRuntime(next) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const config = getAgentRuntime();
  if (body.action === "status") return NextResponse.json({ codex: await getCodexStatus() });
  if (body.action !== "test") return NextResponse.json({ error: "未知 action" }, { status: 400 });
  if (config.mode === "agent_models") return NextResponse.json({ ok: false, error: "当前使用按 Agent 模型配置，请改选本地 Codex CLI 或 OpenAI API。" }, { status: 412 });
  try {
    const messages = [{ role: "user" as const, content: "只回复 OK，不要输出其他内容。" }];
    const output = config.mode === "local_codex" ? await runLocalCodex(messages, config.model) : await runOpenAiApi(messages, config);
    return NextResponse.json({ ok: true, output: output.slice(0, 120) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String((error as Error)?.message || error).slice(0, 240) }, { status: 502 });
  }
}
