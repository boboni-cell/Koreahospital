import { NextRequest, NextResponse } from "next/server";
import { listActions } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const objectType = req.nextUrl.searchParams.get("objectType") ?? undefined;
  const objectIdRaw = req.nextUrl.searchParams.get("objectId");
  const objectId = objectIdRaw ? Number(objectIdRaw) : undefined;
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  return NextResponse.json(listActions({ objectType, objectId, limit }));
}
