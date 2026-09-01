import { NextRequest, NextResponse } from "next/server";
import { getAgentModel, recordTest, type AgentRole } from "@/lib/agent-models";
import { PROVIDERS, chatUrlFor, type ProviderId } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const role = body.role as AgentRole;
  if (!role) return NextResponse.json({ error: "缺 role" }, { status: 400 });
  const m = getAgentModel(role);
  const provider = (m.provider || "mock") as ProviderId;
  // mock 模式或缺 key → 测试接口不允许 fallback
  if (provider === "mock" || !m.api_key) {
    recordTest(role, null, "当前角色为 mock 模式，未配置真实模型，无法测试");
    return NextResponse.json(
      { ok: false, mock: true, error: "当前为 mock 模式，请在「Agent 模型」中选平台 + 填 API Key 后再测试" },
      { status: 412 }
    );
  }
  const baseOverride = provider === "custom" ? m.base_url : (PROVIDERS[provider]?.chat ?? m.base_url);
  const endpoint = chatUrlFor(provider, baseOverride);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.api_key}` },
      body: JSON.stringify({
        model: m.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 8,
      }),
    });
    const txt = await res.text().catch(() => "");
    let echo = "";
    try {
      const j = JSON.parse(txt);
      echo = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.message?.reasoning_content || "";
    } catch {
      echo = txt.slice(0, 80);
    }
    recordTest(role, res.status, res.ok ? null : txt.slice(0, 200));
    return NextResponse.json({ ok: res.ok, status: res.status, echo, provider, endpoint });
  } catch (e) {
    const err = String(e).slice(0, 200);
    recordTest(role, null, err);
    return NextResponse.json({ ok: false, error: err, provider });
  }
}