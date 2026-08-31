import { NextResponse } from "next/server";
import { PLATFORMS, PLATFORM_SKILL } from "@/lib/constants";

export const dynamic = "force-dynamic";
const ACTIVE = ["xiaohongshu", "douyin"];

export async function GET() {
  const platforms = PLATFORMS.map((p) => ({ ...p, status: ACTIVE.includes(p.id) ? "active" : "planning" }));
  return NextResponse.json({ platforms, skill: PLATFORM_SKILL });
}
