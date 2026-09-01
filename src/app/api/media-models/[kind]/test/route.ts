import { NextRequest, NextResponse } from "next/server";
import { getMediaModel, recordMediaTest, type MediaKind } from "@/lib/media-models";
import { getProvider, imageUrlFor, videoUrlFor, type ProviderId } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const kind = body.kind as MediaKind;
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "kind 必须为 image 或 video" }, { status: 400 });
  }
  const m = getMediaModel(kind);
  const provider = (m.provider || "mock") as ProviderId;
  if (provider === "mock" || !m.api_key) {
    recordMediaTest(kind, null, "当前为 mock 模式，无法测试");
    return NextResponse.json({ ok: false, mock: true, error: "mock 模式请先选平台 + 填 Key" }, { status: 412 });
  }
  const tpl = getProvider(provider);
  const endpoint = kind === "video" ? videoUrlFor(provider, m.model, m.base_url) : imageUrlFor(provider, m.model, m.base_url);
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: `${provider} 不支持${kind === "video" ? "视频" : "图像"}` }, { status: 400 });
  }
  // 测试请求最小 body
  // 测试请求用各平台接受的最小可用尺寸：doubao seedream 4.5 要求 ≥2560×1440；OpenAI gpt-image-1 接受 1024×1024
  // 保守取 2560×1440 同时满足新模型与老平台
  // 火山方舟视频走异步任务格式（content 数组）
  const style = kind === "video" ? tpl.videoStyle : tpl.imageStyle;
  let testBody: any;
  if (kind === "video" && style === "ark-task") {
    testBody = { model: m.model, content: [{ type: "text", text: "ping" }] };
  } else if (kind === "video") {
    testBody = { model: m.model, prompt: "test" };
  } else {
    testBody = { model: m.model, prompt: "test", n: 1, size: "2560x1440" };
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.api_key}` },
      body: JSON.stringify(testBody),
    });
    const txt = await res.text().catch(() => "");
    recordMediaTest(kind, res.status, res.ok ? null : txt.slice(0, 200));
    return NextResponse.json({ ok: res.ok, status: res.status, provider, endpoint, style: kind === "video" ? tpl.videoStyle : tpl.imageStyle });
  } catch (e) {
    const err = String(e).slice(0, 200);
    recordMediaTest(kind, null, err);
    return NextResponse.json({ ok: false, error: err });
  }
}