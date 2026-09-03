import { NextRequest, NextResponse } from "next/server";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = path.join(process.cwd(), "data", "d1-config.json");

export async function GET() {
  try {
    const raw = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8"));
    return NextResponse.json({ configured: Boolean(raw.accountId && raw.databaseId && raw.apiToken), accountId: raw.accountId || "", databaseId: raw.databaseId || "", databaseName: raw.databaseName || "", apiTokenSet: Boolean(raw.apiToken), apiBase: raw.apiBase || "https://api.cloudflare.com/client/v4" });
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
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return NextResponse.json({ ok: true, configured: Boolean(next.accountId && next.databaseId && next.apiToken) });
}
