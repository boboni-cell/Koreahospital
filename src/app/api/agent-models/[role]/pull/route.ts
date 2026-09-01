import { NextRequest, NextResponse } from "next/server";
import { getAgentModel, recordTest, type AgentRole } from "@/lib/agent-models";
import { PROVIDERS, modelsUrlFor, type ProviderId } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const role = body.role as AgentRole;
  if (!role) return NextResponse.json({ error: "缺 role" }, { status: 400 });
  const m = getAgentModel(role);
  const provider = (m.provider || "mock") as ProviderId;
  if (provider === "mock" || !m.api_key) {
    recordTest(role, null, "当前角色为 mock 模式，无法拉取真实模型列表");
    return NextResponse.json(
      { ok: false, mock: true, error: "当前为 mock 模式，请在「Agent 模型」中选平台 + 填 API Key 后再拉取" },
      { status: 412 }
    );
  }
  // 火山方舟 / 阿里百炼 等不一定提供 /models；UI 层会提示用户手动填
  if (provider === "volcengine") {
    return NextResponse.json({
      ok: false,
      provider,
      error: "火山方舟不支持通用 /models 列表；请到方舟控制台创建「推理接入点」，把 ep-xxx 填到「模型名」",
    }, { status: 400 });
  }
  const baseOverride = provider === "custom" ? m.base_url : (PROVIDERS[provider]?.chat ?? m.base_url);
  const url = modelsUrlFor(provider, baseOverride);
  if (!url) {
    return NextResponse.json({ ok: false, provider, error: "该平台无 /models 端点" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${m.api_key}` },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      recordTest(role, res.status, err.slice(0, 200));
      return NextResponse.json({ ok: false, status: res.status, error: err.slice(0, 200), provider });
    }
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data || []).map((x) => x.id).filter(Boolean);
    recordTest(role, res.status, null);
    return NextResponse.json({ ok: true, provider, models: ids });
  } catch (e) {
    const err = String(e).slice(0, 200);
    recordTest(role, null, err);
    return NextResponse.json({ ok: false, error: err, provider });
  }
}