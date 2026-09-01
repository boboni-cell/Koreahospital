import { NextResponse } from "next/server";
import { listAgentModels, publicAgentModel } from "@/lib/agent-models";
import { PROVIDER_LIST } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    providers: PROVIDER_LIST,
    models: listAgentModels().map(publicAgentModel),
  });
}