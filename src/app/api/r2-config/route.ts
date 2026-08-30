import { NextRequest, NextResponse } from "next/server";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = path.join(process.cwd(), "data", "r2-config.json");

function mask(s?: string) {
  if (!s) return "";
  return s.length > 8 ? `${s.slice(0, 4)}••••${s.slice(-4)}` : "••••";
}

export async function GET() {
  try {
    const raw = JSON.parse(fsSync.readFileSync(CONFIG_PATH, "utf-8"));
    // 不回传明文密钥，给前端只看状态与已填标记
    return NextResponse.json({
      configured: true,
      bucket: raw.bucket || "",
      publicBase: raw.publicBase || "",
      endpoint: raw.endpoint || "",
      region: raw.region || "auto",
      accessKeyIdSet: !!raw.accessKeyId,
      secretAccessKeySet: !!raw.secretAccessKey,
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
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
  await fs.writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
