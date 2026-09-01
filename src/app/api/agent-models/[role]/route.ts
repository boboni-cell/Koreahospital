import { NextRequest, NextResponse } from "next/server";
import { upsertAgentModel, publicAgentModel, type AgentRole } from "@/lib/agent-models";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const role = body.role as AgentRole;
  if (!role) return NextResponse.json({ error: "缺 role" }, { status: 400 });
  const provider = (body.provider ?? "mock") as ProviderId;
  // 自动派生 base_url：选非 custom 平台时，若用户没填 baseUrl，用模板
  let baseUrl = body.baseUrl;
  if (!baseUrl && provider !== "mock" && provider !== "custom") {
    baseUrl = PROVIDERS[provider]?.chat || "";
  }
  if (provider === "custom" && !baseUrl) {
    return NextResponse.json({ error: "自定义平台必须填 baseUrl" }, { status: 400 });
  }
  if (provider === "mock") {
    baseUrl = "mock://local";
  }
  // is_mock 由 upsertAgentModel 内部根据 "apiKey 是否在 body 里" 派生：
  //   - apiKey 字段不出现 → 保留 DB 原 key，is_mock 自动重算
  //   - apiKey = "" → 视为显式清空，is_mock=1
  //   - apiKey = "sk-xxx" → 视为新 key，is_mock=0
  // 这里不主动覆盖，避免"只改 model 字段的保存"把 key 误清空。
  const patch: Parameters<typeof upsertAgentModel>[1] = {
    provider,
    base_url: baseUrl,
    model: body.model || PROVIDERS[provider]?.defaultModel || "",
    kind: body.kind,
  };
  if (body.apiKey !== undefined) patch.api_key = body.apiKey;
  const m = upsertAgentModel(role, patch);
  return NextResponse.json(publicAgentModel(m));
}