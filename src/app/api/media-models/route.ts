import { NextResponse } from "next/server";
import { listMediaModels, publicMediaModel } from "@/lib/media-models";
import { PROVIDER_LIST } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    providers: PROVIDER_LIST,
    models: listMediaModels().map(publicMediaModel),
  });
}