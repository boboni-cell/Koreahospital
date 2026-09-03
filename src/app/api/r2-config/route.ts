import { NextRequest, NextResponse } from "next/server";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-local";

const CONFIG_PATH = path.join(process.cwd(), "data", "r2-config.json");

function mask(s?: string) {
  if (!s) return "";
  return s.length > 8 ? `${s.slice(0, 4)}••••${s.slice(-4)}` : "••••";
}

export async function GET() {
  try {
    let file: Record<string, string> = {};
    try { file = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8")); } catch { /* 以 .env.local 为准 */ }
    const raw = { ...file, ...readEnvLocal() };
    // 不回传明文密钥，给前端只看状态与已填标记
    return NextResponse.json({
      configured: true,
      bucket: raw.R2_BUCKET || raw.bucket || "",
      publicBase: raw.R2_PUBLIC_BASE || raw.publicBase || "",
      endpoint: raw.R2_ENDPOINT || raw.endpoint || "",
      region: raw.R2_REGION || raw.region || "auto",
      accessKeyIdSet: !!(raw.R2_ACCESS_KEY_ID || raw.accessKeyId),
      secretAccessKeySet: !!(raw.R2_SECRET_ACCESS_KEY || raw.secretAccessKey),
    });
  } catch { return NextResponse.json({ configured: false }); }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  // 保留已有密钥（前端未改动时传遮罩值则沿用）
  let prev: Record<string, string> = {};
  try {
    prev = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    /* 新建 */
  }
  const merged = {
    bucket: body.bucket || "",
    publicBase: body.publicBase || "",
    endpoint: body.endpoint || "",
    region: body.region || "auto",
    accessKeyId:
      body.accessKeyId && !String(body.accessKeyId).includes("•")
        ? body.accessKeyId
        : prev.accessKeyId || "",
    secretAccessKey:
      body.secretAccessKey && !String(body.secretAccessKey).includes("•")
        ? body.secretAccessKey
        : prev.secretAccessKey || "",
  };
  await updateEnvLocal({ R2_BUCKET: merged.bucket, R2_PUBLIC_BASE: merged.publicBase, R2_ENDPOINT: merged.endpoint, R2_REGION: merged.region, ...(merged.accessKeyId ? { R2_ACCESS_KEY_ID: merged.accessKeyId } : {}), ...(merged.secretAccessKey ? { R2_SECRET_ACCESS_KEY: merged.secretAccessKey } : {}) });
  return NextResponse.json({ ok: true });
}
