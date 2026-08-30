import fs from "node:fs/promises";
import { ModelEntry, imageEndpoint, videoEndpoint } from "./models";
import {
  pushToR2,
  localAbsPath,
  localPublicPath,
  safeFileName,
} from "./storage";

export interface GenResult {
  url: string;
  file_type: string;
  stored: string | null; // 本地落盘文件名（用于 R2 同步删除）；远程 URL 时为 null
}

/** 把图像字节落盘并（可选）推 R2，返回公开 URL */
async function saveImageBytes(buf: Buffer, ext: string): Promise<{ stored: string; url: string }> {
  const stored = safeFileName("gen." + ext);
  await fs.writeFile(localAbsPath(stored), buf);
  const r2 = await pushToR2(localAbsPath(stored), stored);
  return { stored, url: r2 ?? localPublicPath(stored) };
}

/** 从各种响应形状里抽取 media url / b64 */
function extractMedia(res: any): { url?: string; b64?: string } {
  if (res?.data?.[0]?.url) return { url: res.data[0].url };
  if (res?.data?.[0]?.b64_json) return { b64: res.data[0].b64_json };
  if (res?.url) return { url: res.url };
  if (res?.output?.url) return { url: res.output.url };
  if (res?.images?.[0]?.url) return { url: res.images[0].url };
  if (Array.isArray(res) && res[0]?.url) return { url: res[0].url };
  return {};
}

export async function generateImage(m: ModelEntry, prompt: string): Promise<GenResult> {
  const res = await fetch(imageEndpoint(m), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.apiKey}` },
    body: JSON.stringify({ model: m.model, prompt, n: 1, size: "1024x1024" }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`图像生成 ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const { url, b64 } = extractMedia(data);
  if (b64) {
    const buf = Buffer.from(b64, "base64");
    const { stored, url: u } = await saveImageBytes(buf, "png");
    return { url: u, file_type: "image", stored };
  }
  if (url) {
    // 远程 URL：尽量下载到本地（便于 R2 同步管理与删除）
    try {
      const imgRes = await fetch(url);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ext = (url.split("?")[0].split(".").pop() || "png").slice(0, 4);
        const { stored, url: u } = await saveImageBytes(buf, ext);
        return { url: u, file_type: "image", stored };
      }
    } catch {
      /* 下载失败则直接用远程 URL */
    }
    return { url, file_type: "image", stored: null };
  }
  throw new Error("图像生成未返回可用结果");
}

export async function generateVideo(m: ModelEntry, prompt: string): Promise<GenResult> {
  const res = await fetch(videoEndpoint(m), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.apiKey}` },
    body: JSON.stringify({ model: m.model, prompt }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`视频生成 ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const { url } = extractMedia(data);
  if (!url) {
    throw new Error("视频生成未返回可用 URL（部分平台为异步任务需轮询，本版暂不支持）");
  }
  return { url, file_type: "video", stored: null };
}
