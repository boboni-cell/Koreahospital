import { NextRequest, NextResponse } from "next/server";
import { upsertMediaModel, publicMediaModel, type MediaKind } from "@/lib/media-models";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const kind = body.kind as MediaKind;
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "kind 必须为 image 或 video" }, { status: 400 });
  }
  const provider = (body.provider ?? "mock") as ProviderId;
  let baseUrl = body.baseUrl;
  if (!baseUrl && provider !== "mock" && provider !== "custom") {
    baseUrl = PROVIDERS[provider]?.image || PROVIDERS[provider]?.chat || "";
  }
  if (provider === "custom" && !baseUrl) {
    return NextResponse.json({ error: "自定义平台必须填 baseUrl" }, { status: 400 });
  }
  if (provider === "mock") baseUrl = "mock://local";
  // 注意：不传 is_mock，让 upsertMediaModel 根据 "api_key 是否在 body 里" 自动派生。
  // apiKey 字段不出现 = 视为"保留 DB 原值"，不误清空。
  const patch: Parameters<typeof upsertMediaModel>[1] = {
    provider,
    base_url: baseUrl,
    model: body.model || PROVIDERS[provider]?.defaultModel || "",
  };
  if (body.apiKey !== undefined) patch.api_key = body.apiKey;
  const m = upsertMediaModel(kind, patch);
  return NextResponse.json(publicMediaModel(m));
}