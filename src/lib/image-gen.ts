import fs from "node:fs/promises";
import { getMediaModel, type MediaModel, type MediaKind } from "./media-models";
import {
  pushToR2,
  localAbsPath,
  localPublicPath,
  safeFileName,
} from "./storage";
import { getProvider, imageUrlFor, videoUrlFor, arkVideoPollUrl, isMockBaseUrl, type ProviderId } from "./providers";

export interface GenResult {
  url: string;
  file_type: string;
  stored: string | null;
}

async function saveImageBytes(buf: Buffer, ext: string): Promise<{ stored: string; url: string }> {
  const stored = safeFileName("gen." + ext);
  await fs.writeFile(localAbsPath(stored), buf);
  const r2 = await pushToR2(localAbsPath(stored), stored);
  return { stored, url: r2 ?? localPublicPath(stored) };
}

function extractMedia(res: any): { url?: string; b64?: string } {
  if (res?.data?.[0]?.url) return { url: res.data[0].url };
  if (res?.data?.[0]?.b64_json) return { b64: res.data[0].b64_json };
  if (res?.url) return { url: res.url };
  if (res?.output?.url) return { url: res.output.url };
  if (res?.images?.[0]?.url) return { url: res.images[0].url };
  if (res?.data?.urls?.[0]) return { url: res.data.urls[0] };
  if (Array.isArray(res) && res[0]?.url) return { url: res[0].url };
  return {};
}

export async function generateImage(prompt: string): Promise<GenResult> {
  const m = getMediaModel("image");
  if (m.is_mock || !m.api_key || isMockBaseUrl(m.base_url)) {
    return await mockImage();
  }
  const provider = (m.provider || "mock") as ProviderId;
  const tpl = getProvider(provider);
  const endpoint = imageUrlFor(provider, m.model, m.base_url);
  if (!endpoint) throw new Error(`${provider} 不支持图像生成（imageStyle=none）`);
  const style = tpl.imageStyle;
  let body: any;
  if (style === "openai") {
    body = { model: m.model, prompt, n: 1, size: "2560x1440", response_format: "url" };
  } else if (style === "atlas") {
    body = { model: m.model, prompt };
  } else if (style === "fal") {
    body = { prompt };
  } else {
    body = { model: m.model, prompt };
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.api_key}` },
    body: JSON.stringify(body),
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
    try {
      const imgRes = await fetch(url);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ext = (url.split("?")[0].split(".").pop() || "png").slice(0, 4);
        const { stored, url: u } = await saveImageBytes(buf, ext);
        return { url: u, file_type: "image", stored };
      }
    } catch { /* 用远程 URL */ }
    return { url, file_type: "image", stored: null };
  }
  throw new Error("图像生成未返回可用结果");
}

export async function generateVideo(prompt: string): Promise<GenResult> {
  const m = getMediaModel("video");
  if (m.is_mock || !m.api_key || isMockBaseUrl(m.base_url)) {
    return mockVideo();
  }
  const provider = (m.provider || "mock") as ProviderId;
  const tpl = getProvider(provider);
  const endpoint = videoUrlFor(provider, m.model, m.base_url);
  if (!endpoint) throw new Error(`${provider} 不支持视频生成（videoStyle=none）`);
  const style = tpl.videoStyle;

  // 火山方舟：异步任务模型 —— 创建 + 轮询
  if (style === "ark-task") {
    return await generateVideoArkTask(provider, m, prompt, tpl);
  }

  // 其余走同步 fetch（OpenAI / atlas / fal）
  let body: any;
  if (style === "openai") {
    body = { model: m.model, prompt };
  } else if (style === "atlas") {
    body = { model: m.model, prompt };
  } else if (style === "fal") {
    body = { prompt };
  } else {
    body = { model: m.model, prompt };
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.api_key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`视频生成 ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const { url } = extractMedia(data);
  if (!url) throw new Error("视频生成未返回可用 URL");
  return { url, file_type: "video", stored: null };
}

/** 火山方舟视频：POST 创建任务 → 轮询 GET 任务状态 → 提取 video_url
 *  最长轮询 360s（12 次 × 30s） */
async function generateVideoArkTask(
  provider: ProviderId,
  m: MediaModel,
  prompt: string,
  tpl: any
): Promise<GenResult> {
  const createUrl = videoUrlFor(provider, m.model, m.base_url);
  // 方舟请求体：text prompt + ratio + duration + resolution（按方舟文档）
  const createBody: any = {
    model: m.model,
    content: [{ type: "text", text: prompt }],
  };
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.api_key}` },
    body: JSON.stringify(createBody),
  });
  if (!createRes.ok) {
    const t = await createRes.text().catch(() => "");
    throw new Error(`方舟视频任务创建失败 ${createRes.status}: ${t.slice(0, 200)}`);
  }
  const created = (await createRes.json()) as { id?: string };
  const taskId = created.id;
  if (!taskId) throw new Error(`方舟视频未返回任务 id: ${JSON.stringify(created).slice(0, 200)}`);

  // 轮询
  const maxAttempts = 12;
  const intervalMs = 30_000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const pollUrl = arkVideoPollUrl(provider, taskId, m.base_url);
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${m.api_key}` },
    });
    if (!pollRes.ok) {
      // 单次失败不放弃，继续轮询
      continue;
    }
    const task = (await pollRes.json()) as { status?: string; content?: { video_url?: string } };
    if (task.status === "succeeded") {
      const url = task.content?.video_url;
      if (url) return { url, file_type: "video", stored: null };
      throw new Error(`方舟视频任务成功但无 video_url: ${JSON.stringify(task).slice(0, 200)}`);
    }
    if (task.status === "failed") {
      throw new Error(`方舟视频任务失败: ${JSON.stringify(task).slice(0, 300)}`);
    }
    // 其他状态（queued / running）继续等
  }
  throw new Error(`方舟视频任务超时（${maxAttempts * intervalMs / 1000}s），task_id=${taskId}`);
}

async function mockImage(): Promise<GenResult> {
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
    "base64"
  );
  const { stored, url } = await saveImageBytes(buf, "png");
  return { url, file_type: "image", stored };
}
function mockVideo(): GenResult {
  return { url: "/uploads/mock-video.mp4", file_type: "video", stored: "mock-video.mp4" };
}