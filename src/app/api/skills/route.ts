import { NextResponse } from "next/server";
import { listSkills, catalog } from "@/lib/skills";
import { PLATFORM_SKILL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await listSkills();
  return NextResponse.json({ skills: catalog(all), platformSkill: PLATFORM_SKILL });
}
