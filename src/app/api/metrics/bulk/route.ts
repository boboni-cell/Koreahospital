import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentProjectId } from "@/lib/projects";

/**
 * 批量录入运营数据（来自 CSV 上传 / 表格粘贴）。
 * 每行可带 account_id（直接对应账号），或 platform + handle（自动匹配账号）。
 * 按 (account_id, date) 幂等 upsert，重复上传不重复累计。
 */
export async function POST(req: NextRequest) {
  const projectId = getCurrentProjectId();
  const body = await req.json();
  const rows: any[] = body.rows || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows 为空" }, { status: 400 });
  }

  // 账号映射：platform+handle -> id
  const accRows = db.prepare("SELECT id, platform, handle FROM accounts WHERE project_id=?").all(projectId) as {
    id: number;
    platform: string;
    handle: string;
  }[];
  const byKey = new Map<string, number>();
  for (const a of accRows) byKey.set(`${a.platform}|${a.handle}`.toLowerCase(), a.id);

  const upsert = db.prepare(`
    INSERT INTO metrics (account_id, date, followers, likes, saves, comments, shares, views, project_id)
    VALUES (@account_id, @date, @followers, @likes, @saves, @comments, @shares, @views, @project_id)
    ON CONFLICT(account_id, date) DO UPDATE SET
      followers=excluded.followers, likes=excluded.likes, saves=excluded.saves,
      comments=excluded.comments, shares=excluded.shares, views=excluded.views
  `);

  const norm = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  let inserted = 0;
  let skipped = 0;
  const usedAccountIds = new Set<number>();
  const tx = db.transaction((items: any[]) => {
    for (const r of items) {
      let accountId = r.account_id ? Number(r.account_id) : null;
      if (!accountId && r.platform && r.handle) {
        accountId = byKey.get(`${String(r.platform).toLowerCase()}|${String(r.handle).toLowerCase()}`) ?? null;
      }
      if (!accountId) { skipped++; continue; }
      const date = (r.date || "").toString().slice(0, 10);
      if (!date) { skipped++; continue; }
      upsert.run({
        account_id: accountId,
        date,
        followers: norm(r.followers),
        likes: norm(r.likes),
        saves: norm(r.saves),
        comments: norm(r.comments),
        shares: norm(r.shares),
        views: norm(r.views),
        project_id: projectId,
      });
      usedAccountIds.add(accountId);
      inserted++;
    }
  });
  tx(rows);

  for (const accountId of usedAccountIds) {
    const latest = db.prepare("SELECT followers FROM metrics WHERE project_id=? AND account_id=? ORDER BY date DESC LIMIT 1").get(projectId, accountId) as { followers: number } | undefined;
    if (latest) db.prepare("UPDATE accounts SET followers=? WHERE id=? AND project_id=?").run(latest.followers, accountId, projectId);
  }

  // 记录本次上传事件
  db.prepare(
    "INSERT INTO metrics_uploads (rows_count, inserted, skipped, project_id) VALUES (?, ?, ?, ?)"
  ).run(rows.length, inserted, skipped, projectId);

  return NextResponse.json({ ok: true, inserted, skipped });
}
