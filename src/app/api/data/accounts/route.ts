import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";
import { median, metricRate } from "@/lib/post-analytics";

export const dynamic = "force-dynamic";

type Metric = { date: string; followers: number; likes: number; saves: number; comments: number; shares: number; views: number };

function deltaFor(rows: Metric[], days: number) {
  if (!rows.length) return 0;
  const latest = rows[rows.length - 1];
  const cutoff = new Date(`${latest.date}T00:00:00+08:00`); cutoff.setDate(cutoff.getDate() - days);
  const base = rows.find((row) => new Date(`${row.date}T00:00:00+08:00`) >= cutoff) ?? rows[0];
  return latest.followers - base.followers;
}

export async function GET(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const platform = req.nextUrl.searchParams.get("platform") ?? "all";
  const accountId = Number(req.nextUrl.searchParams.get("account_id")) || null;
  const accountParams: unknown[] = [projectId];
  const accountWhere = ["project_id=?"];
  if (platform !== "all") { accountWhere.push("platform=?"); accountParams.push(platform); }
  if (accountId) { accountWhere.push("id=?"); accountParams.push(accountId); }
  const accounts = db.prepare(`SELECT id, platform, handle, followers, positioning FROM accounts WHERE ${accountWhere.join(" AND ")} ORDER BY platform, id`)
    .all(...accountParams) as { id: number; platform: string; handle: string; followers: number; positioning: string | null }[];

  const cards = accounts.map((account) => {
    const metrics = db.prepare("SELECT date, followers, likes, saves, comments, shares, views FROM metrics WHERE project_id=? AND account_id=? ORDER BY date ASC")
      .all(projectId, account.id) as Metric[];
    const latest = metrics[metrics.length - 1];
    const postRows = db.prepare(`
      SELECT m.views, m.likes, m.saves, m.comments, m.shares, m.follower_gain
      FROM post_analytics p JOIN post_metric_windows m ON m.post_id=p.id AND m.window='7d'
      WHERE p.project_id=? AND p.account_id=? AND date(p.published_at)>=date('now','-30 days') AND m.views>=1000
    `).all(projectId, account.id) as { views: number; likes: number; saves: number; comments: number; shares: number; follower_gain: number | null }[];
    const rates = postRows.map((row) => ({ engagement: metricRate(row.likes + row.saves + row.comments + row.shares, row.views), share: metricRate(row.shares, row.views), follower: metricRate(row.follower_gain, row.views) }));
    const priorRows = db.prepare(`
      SELECT m.views, m.likes, m.saves, m.comments, m.shares
      FROM post_analytics p JOIN post_metric_windows m ON m.post_id=p.id AND m.window='7d'
      WHERE p.project_id=? AND p.account_id=? AND date(p.published_at)<date('now','-30 days') AND date(p.published_at)>=date('now','-60 days') AND m.views>=1000
    `).all(projectId, account.id) as { views: number; likes: number; saves: number; comments: number; shares: number }[];
    const currentEngagement = median(rates.map((rate) => rate.engagement));
    const priorEngagement = median(priorRows.map((row) => metricRate(row.likes + row.saves + row.comments + row.shares, row.views)));
    return { ...account, current_followers: latest?.followers ?? account.followers, delta_7d: deltaFor(metrics, 7), delta_30d: deltaFor(metrics, 30), posts_30d: postRows.length, engagement_rate: currentEngagement, engagement_change: currentEngagement == null || priorEngagement == null ? null : Number((currentEngagement - priorEngagement).toFixed(2)), share_rate: median(rates.map((rate) => rate.share)), follower_conversion_rate: median(rates.map((rate) => rate.follower)) };
  });

  const seriesParams: unknown[] = [projectId];
  const seriesWhere = ["m.project_id=?"];
  if (platform !== "all") { seriesWhere.push("a.platform=?"); seriesParams.push(platform); }
  if (accountId) { seriesWhere.push("m.account_id=?"); seriesParams.push(accountId); }
  const seriesRows = db.prepare(`SELECT m.date, SUM(m.followers) AS followers, SUM(m.likes) AS likes, SUM(m.views) AS views, SUM(m.saves) AS saves FROM metrics m JOIN accounts a ON a.id=m.account_id WHERE ${seriesWhere.join(" AND ")} GROUP BY m.date ORDER BY m.date ASC LIMIT 90`).all(...seriesParams);
  return NextResponse.json({ accounts: cards, series: seriesRows, timezone: "Asia/Shanghai" });
}
