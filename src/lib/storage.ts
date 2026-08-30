import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

/** 本地文件落盘目录：public/uploads（可被 Next 静态服务） */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * R2 配置（可选）。配置来源：环境变量 或 data/r2-config.json（gitignore 保护）。
 * 无需安装额外 SDK —— 通过 wrangler CLI 操作 R2（对应「接一个 cloudflare cli」）。
 */
export interface R2Config {
  bucket: string;
  publicBase?: string; // 公开访问前缀，如 https://cdn.xxx.com
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

const R2_CONFIG_PATH = path.join(process.cwd(), "data", "r2-config.json");

export function getR2Config(): R2Config | null {
  const env = process.env;
  let fileCfg: Partial<R2Config> = {};
  try {
    fileCfg = JSON.parse(fsSync.readFileSync(R2_CONFIG_PATH, "utf-8"));
  } catch {
    /* 无文件配置 */
  }
  const {
    R2_BUCKET,
    R2_PUBLIC_BASE,
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_REGION,
  } = env;
  const bucket = R2_BUCKET || fileCfg.bucket;
  const accessKeyId = R2_ACCESS_KEY_ID || fileCfg.accessKeyId;
  const secretAccessKey = R2_SECRET_ACCESS_KEY || fileCfg.secretAccessKey;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    publicBase: R2_PUBLIC_BASE || fileCfg.publicBase,
    endpoint: R2_ENDPOINT || fileCfg.endpoint || "",
    accessKeyId,
    secretAccessKey,
    region: R2_REGION || fileCfg.region || "auto",
  };
}

export function isR2Enabled(): boolean {
  return getR2Config() !== null;
}

/** 确保本地上传目录存在 */
export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** 本地相对 public 的路径（存库用），返回形如 /uploads/abc.jpg */
export function localPublicPath(filename: string): string {
  return `/uploads/${filename}`;
}

export function localAbsPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

/**
 * 上传文件到 R2（若已配置）。通过 wrangler CLI 推送，返回公开访问 URL。
 * 失败时返回 null（本地文件仍作为兜底）。
 */
export async function pushToR2(
  localAbs: string,
  key: string
): Promise<string | null> {
  const cfg = getR2Config();
  if (!cfg) return null;
  try {
    const env = {
      ...process.env,
      CLOUDFLARE_R2_BUCKET: cfg.bucket,
      CLOUDFLARE_R2_ENDPOINT: cfg.endpoint,
      CLOUDFLARE_R2_ACCESS_KEY_ID: cfg.accessKeyId,
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: cfg.secretAccessKey,
      CLOUDFLARE_R2_REGION: cfg.region,
    };
    await execFileP(
      "npx",
      ["wrangler", "r2", "object", "put", `${cfg.bucket}/${key}`, "--file", localAbs],
      { timeout: 120000, env }
    );
    return cfg.publicBase ? `${cfg.publicBase.replace(/\/$/, "")}/${key}` : `${cfg.bucket}/${key}`;
  } catch (e) {
    console.error("[R2] wrangler put failed (fallback to local):", e);
    return null;
  }
}

/**
 * 删除素材文件：本地必删；若配置了 R2 则同时调用 wrangler 删除（best-effort，失败不影响主流程）。
 * @param r2Key 形如 abc.jpg（本地文件名即 R2 key）
 */
export async function purgeFile(r2Key: string | null): Promise<void> {
  // 1) 本地文件删除
  if (r2Key) {
    try {
      await fs.unlink(localAbsPath(path.basename(r2Key)));
    } catch {
      /* 文件可能本就不存在，忽略 */
    }
  }
  // 2) R2 同步删除（接 cloudflare cli：wrangler）
  const cfg = getR2Config();
  if (cfg && r2Key) {
    try {
      const env = {
        ...process.env,
        CLOUDFLARE_R2_BUCKET: cfg.bucket,
        CLOUDFLARE_R2_ENDPOINT: cfg.endpoint,
        CLOUDFLARE_R2_ACCESS_KEY_ID: cfg.accessKeyId,
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: cfg.secretAccessKey,
        CLOUDFLARE_R2_REGION: cfg.region,
      };
      await execFileP(
        "npx",
        ["wrangler", "r2", "object", "delete", `${cfg.bucket}/${r2Key}`],
        { timeout: 30000, env }
      );
    } catch (e) {
      // 非阻塞：本地已删，R2 删除失败仅记录
      console.error("[R2] wrangler delete failed (non-fatal):", e);
    }
  }
}

/** 生成安全的存储文件名（去重 + 防路径穿越） */
export function safeFileName(original: string): string {
  const ext = path.extname(original).slice(0, 10).replace(/[^.a-zA-Z0-9]/g, "");
  const base = path
    .basename(original, ext)
    .replace(/[^\w一-龥-]/g, "_")
    .slice(0, 60);
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${base || "asset"}_${stamp}${ext || ""}`;
}
