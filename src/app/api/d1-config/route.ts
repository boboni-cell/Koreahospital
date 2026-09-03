import { NextRequest, NextResponse } from "next/server";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { readEnvLocal, updateEnvLocal } from "@/lib/env-local";

const CONFIG_PATH = path.join(process.cwd(), "data", "d1-config.json");

export async function GET() {
  try {
    let file: Record<string, string> = {};
    try { file = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8")); } catch { /* 以 .env.local 为准 */ }
    const raw = { ...file, ...readEnvLocal() };
    return NextResponse.json({ configured: Boolean((raw.CLOUDFLARE_ACCOUNT_ID || raw.accountId) && (raw.D1_DATABASE_ID || raw.databaseId) && (raw.CLOUDFLARE_API_TOKEN || raw.apiToken)), accountId: raw.CLOUDFLARE_ACCOUNT_ID || raw.accountId || "", databaseId: raw.D1_DATABASE_ID || raw.databaseId || "", databaseName: raw.D1_DATABASE_NAME || raw.databaseName || "", apiTokenSet: Boolean(raw.CLOUDFLARE_API_TOKEN || raw.apiToken), apiBase: raw.D1_API_BASE || raw.apiBase || "https://api.cloudflare.com/client/v4" });
  } catch {
    return NextResponse.json({ configured: false, accountId: "", databaseId: "", databaseName: "", apiTokenSet: false, apiBase: "https://api.cloudflare.com/client/v4" });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let previous: Record<string, string> = {};
  try { previous = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8")); } catch { /* 新配置 */ }
  const apiToken = body.apiToken && !String(body.apiToken).includes("•") ? String(body.apiToken) : previous.apiToken || "";
  const next = { accountId: String(body.accountId || "").trim(), databaseId: String(body.databaseId || "").trim(), databaseName: String(body.databaseName || "").trim(), apiToken, apiBase: String(body.apiBase || "https://api.cloudflare.com/client/v4").trim() };
  await updateEnvLocal({ CLOUDFLARE_ACCOUNT_ID: next.accountId, D1_DATABASE_ID: next.databaseId, D1_DATABASE_NAME: next.databaseName, D1_API_BASE: next.apiBase, ...(next.apiToken ? { CLOUDFLARE_API_TOKEN: next.apiToken } : {}) });
  return NextResponse.json({ ok: true, configured: Boolean(next.accountId && next.databaseId && next.apiToken) });
}
