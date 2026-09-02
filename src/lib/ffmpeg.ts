import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  ensureUploadDir,
  localAbsPath,
  pushToR2,
  safeFileName,
  localPublicPath,
} from "./storage.ts";

const execFileP = promisify(execFile);

/** 允许通过 FFMPEG_PATH 覆盖二进制路径（容器/CI 场景）。 */
export function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export async function hasFFmpeg(): Promise<boolean> {
  try {
    await execFileP(ffmpegPath(), ["-version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  // 本地 /uploads/xxx 或绝对路径：直接复制
  if (!/^https?:\/\//i.test(url)) {
    const isUpload = url.startsWith("/uploads/");
    const src = isUpload ? localAbsPath(path.basename(url)) : url;
    await fs.copyFile(src, dest);
    return;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`下载视频失败 ${res.status}`);
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * 用 ffmpeg 按顺序拼接多段视频。
 * 先尝试流复制（-c copy，快且无损）；若编码/分辨率不一致失败，则回退统一重编码。
 * @returns 拼接结果 mp4 的完整字节
 */
export async function stitchVideos(urls: string[]): Promise<Buffer> {
  if (urls.length < 2) throw new Error("至少需要两段视频才能拼接");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "korea-stitch-"));
  try {
    const files: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const filePath = path.join(dir, `seg${i}.mp4`);
      await downloadToFile(urls[i], filePath);
      files.push(filePath);
    }
    const listPath = path.join(dir, "list.txt");
    const list = files
      .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await fs.writeFile(listPath, list, "utf-8");

    const outPath = path.join(dir, "stitched.mp4");
    try {
      await execFileP(
        ffmpegPath(),
        ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
        { timeout: 180_000 }
      );
    } catch (copyError) {
      // 回退：统一转 H.264 + AAC，保证可播放
      await execFileP(
        ffmpegPath(),
        [
          "-y",
          "-f", "concat", "-safe", "0",
          "-i", listPath,
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-c:a", "aac",
          "-movflags", "+faststart",
          outPath,
        ],
        { timeout: 300_000 }
      );
    }
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** 把拼接好的视频字节落盘到本地 uploads，并尝试推送 R2。 */
export async function saveVideoBytes(buf: Buffer, ext = "mp4"): Promise<{ stored: string; url: string }> {
  await ensureUploadDir();
  const stored = safeFileName("stitched." + ext);
  await fs.writeFile(localAbsPath(stored), buf);
  const r2 = await pushToR2(localAbsPath(stored), stored);
  return { stored, url: r2 ?? localPublicPath(stored) };
}
