import { NextRequest, NextResponse } from "next/server";
import { readAiConfig, writeAiConfig } from "@/lib/ai-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await readAiConfig();
  // 不回传完整 key，仅回显是否已配置
  return NextResponse.json({
    ...cfg,
    apiKey: cfg.apiKey ? "***已配置***" : "",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cfg = {
    baseUrl: body.baseUrl ?? "",
    apiKey: body.apiKey ?? "",
    model: body.model ?? "",
    enabled: body.enabled ?? false,
  };
  await writeAiConfig(cfg);
  return NextResponse.json({ ok: true });
}
