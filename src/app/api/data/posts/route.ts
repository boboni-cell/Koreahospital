import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { median, metricRate } from "@/lib/post-analytics";

export const dynamic = "force-dynamic";

type PostRow = {
  id: number; platform: string; account_id: number | null; handle: string | null;
  title: string | null; tags: string | null; pillar_name: string | null; published_at: string | null;
  views: number; likes: number; saves: number; comments: number; shares: number; follower_gain: number | null;
  insufficient_data: number; observed_at: string | null;
};

function enriched(row: PostRow) {
  let tags: string[] = [];
  try { tags = JSON.parse(row.tags || "[]"); } catch {}
  const interactions = row.likes + row.saves + row.comments + row.shares;
  return {
    ...row,
    tags,
    title_length: Array.from(row.title ?? "").length,
    tag_count: tags.length,
    engagement_rate: metricRate(interactions, row.views),
    share_rate: metricRate(row.shares, row.views),
    follower_conversion_rate: metricRate(row.follower_gain, row.views),
    low_sample: row.views < 1000 || Boolean(row.insufficient_data),
  };
}

function summarize(rows: ReturnType<typeof enriched>[]) {
  const reliable = rows.filter((row) => !row.low_sample);
  return {
    posts: rows.length,
    reliable_posts: reliable.length,
    total_views: rows.reduce((sum, row) => sum + row.views, 0),
    engagement_rate: median(reliable.map((row) => row.engagement_rate)),
    share_rate: median(reliable.map((row) => row.share_rate)),
    follower_conversion_rate: median(reliable.map((row) => row.follower_conversion_rate)),
  };
}

function grouped(rows: ReturnType<typeof enriched>[], getKey: (row: ReturnType<typeof enriched>) => string) {
  const groups = new Map<string, ReturnType<typeof enriched>[]>();
  for (const row of rows) groups.set(getKey(row), [...(groups.get(getKey(row)) ?? []), row]);
  return [...groups.entries()].map(([label, items]) => ({ label, count: items.length, engagement_rate: median(items.filter((item) => !item.low_sample).map((item) => item.engagement_rate)) }));
}

export async function GET(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const platform = req.nextUrl.searchParams.get("platform") ?? "all";
  const accountId = Number(req.nextUrl.searchParams.get("account_id")) || null;
  const window = ["24h", "7d", "30d"].includes(req.nextUrl.searchParams.get("window") ?? "") ? req.nextUrl.searchParams.get("window")! : "7d";
  const days = Math.min(3650, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const conditions = ["p.project_id=?", "m.window=?", "date(p.published_at) >= date('now', ?)"];
  const params: unknown[] = [projectId, window, `-${days} days`];
  if (platform !== "all") { conditions.push("p.platform=?"); params.push(platform); }
  if (accountId) { conditions.push("p.account_id=?"); params.push(accountId); }

  const raw = db.prepare(`
    SELECT p.id, p.platform, p.account_id, a.handle, p.title, p.tags, cp.name AS pillar_name, p.published_at,
      m.views, m.likes, m.saves, m.comments, m.shares, m.follower_gain, m.insufficient_data, m.observed_at
    FROM post_analytics p
    JOIN post_metric_windows m ON m.post_id=p.id
    LEFT JOIN accounts a ON a.id=p.account_id
    LEFT JOIN content_pillars cp ON cp.id=p.pillar_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY datetime(p.published_at) DESC, p.id DESC
  `).all(...params) as PostRow[];
  const rows = raw.map(enriched);
  const platformGroups = ["xiaohongshu", "douyin"].map((id) => ({ platform: id, ...summarize(rows.filter((row) => row.platform === id)) }));
  const trend = [...rows].sort((a, b) => String(a.published_at).localeCompare(String(b.published_at))).map((row) => ({
    id: row.id, date: row.published_at ?? "", title: row.title ?? "未命名帖子", platform: row.platform, engagement_rate: row.engagement_rate,
  }));
  const titleGroups = grouped(rows, (row) => row.title_length <= 10 ? "短标题 ≤10字" : row.title_length <= 20 ? "中标题 11–20字" : "长标题 >20字");
  const tagGroups = grouped(rows, (row) => row.tag_count <= 2 ? "少标签 0–2个" : row.tag_count <= 5 ? "中标签 3–5个" : "多标签 ≥6个");
  const accounts = db.prepare("SELECT id, platform, handle FROM accounts WHERE project_id=? ORDER BY platform, id").all(projectId);
  return NextResponse.json({ filters: { platform, account_id: accountId, window, days, timezone: "Asia/Shanghai" }, accounts, summary: summarize(rows), platformGroups, trend, titleGroups, tagGroups, rows });
}
