import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import readXlsxFile from "read-excel-file/node";
import db from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { getCurrentProjectId } from "@/lib/projects";
import { detectPostMapping, parseTags, postExternalId, type PostImportField } from "@/lib/post-analytics";

export const dynamic = "force-dynamic";

const IMPORT_DIR = path.join(process.cwd(), "data", "imports");

function safeStoredName(name: string, hash: string) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^\w一-龥-]/g, "_").slice(0, 60) || "data";
  return `${hash.slice(0, 16)}-${base}${ext}`;
}

function cell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

async function readRows(storedPath: string) {
  if (storedPath.toLowerCase().endsWith(".xlsx")) {
    const rows = await readXlsxFile(await fs.readFile(storedPath));
    const strings = rows.map((row) => row.map(cell));
    return { headers: strings[0] ?? [], rows: strings.slice(1).filter((row) => row.some(Boolean)) };
  }
  const parsed = parseCsv(await fs.readFile(storedPath, "utf8"));
  return { headers: parsed.headers, rows: parsed.rows };
}

function numberAt(row: string[], index: number) {
  if (index < 0 || row[index] == null || row[index] === "") return null;
  const value = Number(String(row[index]).replace(/[,，\s]/g, ""));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

function valueAt(row: string[], index: number) {
  return index >= 0 ? String(row[index] ?? "").trim() : "";
}

export async function GET() {
  const projectId = getCurrentProjectId();
  const batches = db.prepare(`
    SELECT b.id, b.platform, b.filename, b.rows_count, b.inserted, b.updated, b.skipped, b.created_at, a.handle
    FROM data_import_batches b
    LEFT JOIN accounts a ON a.id=b.account_id AND a.project_id=b.project_id
    WHERE b.project_id=? AND b.kind='post'
    ORDER BY b.id DESC LIMIT 12
  `).all(projectId);
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择官方导出文件" }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase();
    if (![".csv", ".txt", ".xlsx"].includes(ext)) return NextResponse.json({ error: "支持 CSV、TXT、XLSX" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    await fs.mkdir(IMPORT_DIR, { recursive: true });
    const token = safeStoredName(file.name, hash);
    const storedPath = path.join(IMPORT_DIR, token);
    await fs.writeFile(storedPath, buffer);
    const parsed = await readRows(storedPath);
    return NextResponse.json({
      token,
      filename: file.name,
      hash,
      headers: parsed.headers,
      preview: parsed.rows.slice(0, 8),
      rowsCount: parsed.rows.length,
      mapping: detectPostMapping(parsed.headers),
    });
  }

  const body = await req.json();
  const token = path.basename(String(body.token ?? ""));
  const storedPath = path.join(IMPORT_DIR, token);
  if (!token || path.dirname(path.resolve(storedPath)) !== path.resolve(IMPORT_DIR)) return NextResponse.json({ error: "导入文件无效" }, { status: 400 });
  const parsed = await readRows(storedPath);
  const mapping = body.mapping as Record<PostImportField, number>;
  const platform = body.platform === "douyin" ? "douyin" : "xiaohongshu";
  const accountId = Number(body.account_id) || null;
  const window = body.window === "24h" || body.window === "30d" ? body.window : "7d";
  const projectId = getCurrentProjectId();
  const fileBuffer = await fs.readFile(storedPath);
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
  const filename = String(body.filename ?? token);
  let inserted = 0; let updated = 0; let skipped = 0;

  const batchInfo = db.prepare(`
    INSERT INTO data_import_batches (project_id, kind, platform, account_id, filename, stored_path, file_hash, rows_count, mapping_json)
    VALUES (?, 'post', ?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, platform, accountId, filename, storedPath, fileHash, parsed.rows.length, JSON.stringify(mapping));
  const batchId = Number(batchInfo.lastInsertRowid);
  const pillars = db.prepare("SELECT id, name FROM content_pillars WHERE project_id=?").all(projectId) as { id: number; name: string }[];

  const run = db.transaction(() => {
    for (const row of parsed.rows) {
      const title = valueAt(row, mapping.title);
      const postUrl = valueAt(row, mapping.post_url);
      const publishedAt = valueAt(row, mapping.published_at);
      if (!title && !postUrl && mapping.external_post_id < 0) { skipped++; continue; }
      const externalId = postExternalId(platform, valueAt(row, mapping.external_post_id), postUrl, title, publishedAt);
      const existing = db.prepare("SELECT id FROM post_analytics WHERE project_id=? AND platform=? AND external_post_id=?")
        .get(projectId, platform, externalId) as { id: number } | undefined;
      const content = valueAt(row, mapping.content);
      const tags = parseTags(valueAt(row, mapping.tags), content);
      const pillarName = valueAt(row, mapping.pillar);
      const pillarId = pillars.find((pillar) => pillar.name === pillarName)?.id ?? null;
      db.prepare(`
        INSERT INTO post_analytics (project_id, platform, account_id, external_post_id, post_url, title, content, tags, pillar_id, published_at, source_batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, platform, external_post_id) DO UPDATE SET
          account_id=excluded.account_id, post_url=excluded.post_url, title=excluded.title, content=excluded.content,
          tags=excluded.tags, pillar_id=COALESCE(excluded.pillar_id, post_analytics.pillar_id),
          published_at=excluded.published_at, source_batch_id=excluded.source_batch_id, updated_at=CURRENT_TIMESTAMP
      `).run(projectId, platform, accountId, externalId, postUrl || null, title || null, content || null, JSON.stringify(tags), pillarId, publishedAt || null, batchId);
      const post = db.prepare("SELECT id FROM post_analytics WHERE project_id=? AND platform=? AND external_post_id=?")
        .get(projectId, platform, externalId) as { id: number };
      const views = numberAt(row, mapping.views) ?? 0;
      const followerGain = numberAt(row, mapping.follower_gain);
      db.prepare(`
        INSERT INTO post_metric_windows (post_id, window, views, likes, saves, comments, shares, follower_gain, insufficient_data, observed_at, source_batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(post_id, window) DO UPDATE SET views=excluded.views, likes=excluded.likes, saves=excluded.saves,
          comments=excluded.comments, shares=excluded.shares, follower_gain=excluded.follower_gain,
          insufficient_data=excluded.insufficient_data, observed_at=CURRENT_TIMESTAMP,
          source_batch_id=excluded.source_batch_id, updated_at=CURRENT_TIMESTAMP
      `).run(post.id, window, views, numberAt(row, mapping.likes) ?? 0, numberAt(row, mapping.saves) ?? 0, numberAt(row, mapping.comments) ?? 0, numberAt(row, mapping.shares) ?? 0, followerGain, views < 1000 ? 1 : 0, batchId);
      if (existing) updated++; else inserted++;
    }
    db.prepare("UPDATE data_import_batches SET inserted=?, updated=?, skipped=? WHERE id=?").run(inserted, updated, skipped, batchId);
  });
  run();

  return NextResponse.json({ ok: true, batchId, inserted, updated, skipped, rowsCount: parsed.rows.length });
}
