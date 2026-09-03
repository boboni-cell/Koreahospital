import { NextResponse } from "next/server";
import { HOTSPOT_SOURCES, normalizeHotspots } from "@/lib/daily-hotspots";
import type { HotspotItem } from "@/lib/daily-hotspots";
import { fetchTrendRadarHotspots, trendRadarConfigured } from "@/lib/trendradar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = (process.env.SIXTY_SECONDS_API_BASE || "https://60s.viki.moe").replace(/\/$/, "");
  const results: Array<{ id: string; name: string; items: HotspotItem[]; error: string | null }> = await Promise.all(HOTSPOT_SOURCES.map(async (source) => {
    try {
      const response = await fetch(`${base}/v2/${source.id}`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ...source, items: normalizeHotspots(await response.json()), error: null };
    } catch (error: any) {
      return { ...source, items: [], error: String(error?.message || error).slice(0, 120) };
    }
  }));
  const url = new URL(req.url);
  const trendQuery = url.searchParams.get("trend_query")?.trim() || "";
  const trendRequested = url.searchParams.get("provider") === "trendaradar" || Boolean(trendQuery);
  if (trendRequested) {
    if (!trendQuery) results.push({ id: "trendaradar", name: "TrendRadar", items: [], error: "请输入 TrendRadar 关键词" });
    else if (!trendRadarConfigured()) results.push({ id: "trendaradar", name: "TrendRadar", items: [], error: "未配置 TRENDRADAR_MCP_URL" });
    else {
      try { results.push({ id: "trendaradar", name: "TrendRadar", items: await fetchTrendRadarHotspots(trendQuery), error: null }); }
      catch (error: any) { results.push({ id: "trendaradar", name: "TrendRadar", items: [], error: String(error?.message || error).slice(0, 120) }); }
    }
  }
  return NextResponse.json({ sources: results, fetchedAt: new Date().toISOString(), provider: "vikiboss/60s", optionalProvider: trendRequested ? "trendaradar" : null });
}
