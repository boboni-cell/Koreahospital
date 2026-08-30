import { NextRequest, NextResponse } from "next/server";
import { getAgentConfig, setAgentConfig } from "@/lib/agent";

export async function GET() {
  const cfg = await getAgentConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cfg = await setAgentConfig({ systemPrompt: body.systemPrompt });
  return NextResponse.json(cfg);
}
