import { NextResponse } from "next/server";
import { HOTSPOT_SOURCES, normalizeHotspots } from "@/lib/daily-hotspots";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = (process.env.SIXTY_SECONDS_API_BASE || "https://60s.viki.moe").replace(/\/$/, "");
  const results = await Promise.all(HOTSPOT_SOURCES.map(async (source) => {
    try {
      const response = await fetch(`${base}/v2/${source.id}`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ...source, items: normalizeHotspots(await response.json()), error: null };
    } catch (error: any) {
      return { ...source, items: [], error: String(error?.message || error).slice(0, 120) };
    }
  }));
  return NextResponse.json({ sources: results, fetchedAt: new Date().toISOString(), provider: "vikiboss/60s" });
}
