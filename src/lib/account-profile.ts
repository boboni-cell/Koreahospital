export interface ParsedAccountProfile {
  platform: string;
  externalId: string | null;
  handle: string | null;
  profileUrl: string;
}

const PLATFORM_HOSTS: Array<[string, string[]]> = [
  ["xiaohongshu", ["xiaohongshu.com", "xhslink.com"]],
  ["douyin", ["douyin.com"]],
  ["tiktok", ["tiktok.com"]],
  ["instagram", ["instagram.com"]],
  ["youtube", ["youtube.com", "youtu.be"]],
  ["weibo", ["weibo.com"]],
  ["wechat", ["weixin.qq.com"]],
  ["naver", ["naver.com"]],
];

function platformFor(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return PLATFORM_HOSTS.find(([, hosts]) => hosts.some((item) => host === item || host.endsWith(`.${item}`)))?.[0] ?? null;
}

function pathValue(platform: string, url: URL) {
  const parts = url.pathname.split("/").filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const at = parts.find((part) => part.startsWith("@"));
  if (at) return at.slice(1);
  if (platform === "youtube" && parts[0] === "channel") return parts[1] ?? null;
  if (platform === "weibo" && parts[0] === "u") return parts[1] ?? null;
  if (platform === "xiaohongshu" && parts[0] === "user") return parts.at(-1) ?? null;
  if (platform === "douyin" && parts[0] === "user") return parts[1] ?? null;
  return parts.at(-1) ?? null;
}

export function parseAccountProfile(value: string): ParsedAccountProfile | null {
  const raw = value.trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  const platform = platformFor(url.hostname);
  if (!platform) return null;
  const externalId = pathValue(platform, url);
  const handle = externalId && !/^\d+$/.test(externalId) ? externalId : null;
  return { platform, externalId, handle, profileUrl: url.toString() };
}
