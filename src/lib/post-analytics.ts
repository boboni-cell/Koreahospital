import { createHash } from "node:crypto";

export const POST_IMPORT_FIELDS = [
  "external_post_id", "post_url", "title", "content", "tags", "published_at",
  "views", "likes", "saves", "comments", "shares", "follower_gain", "pillar",
] as const;

export type PostImportField = (typeof POST_IMPORT_FIELDS)[number];

const HEADER_ALIASES: Record<PostImportField, string[]> = {
  external_post_id: ["postid", "noteid", "itemid", "作品id", "笔记id", "视频id", "内容id", "帖子id"],
  post_url: ["url", "link", "链接", "作品链接", "笔记链接", "视频链接", "内容链接"],
  title: ["title", "标题", "作品标题", "笔记标题", "视频标题", "内容标题"],
  content: ["content", "body", "正文", "文案", "作品内容", "笔记正文"],
  tags: ["tags", "hashtags", "标签", "话题", "话题标签"],
  published_at: ["publishedat", "publishtime", "date", "发布时间", "发布日期", "发布日"],
  views: ["views", "plays", "reads", "播放量", "阅读量", "观看量", "有效观看"],
  likes: ["likes", "点赞", "点赞数"],
  saves: ["saves", "favorites", "收藏", "收藏数"],
  comments: ["comments", "评论", "评论数"],
  shares: ["shares", "分享", "分享数", "转发", "转发数"],
  follower_gain: ["followergain", "newfollowers", "新增粉丝", "涨粉", "新增关注", "新关注"],
  pillar: ["pillar", "内容支柱", "内容分类", "栏目"],
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_\-\/（）()]/g, "");
}

export function detectPostMapping(headers: string[]): Record<PostImportField, number> {
  const values = headers.map(normalized);
  return Object.fromEntries(POST_IMPORT_FIELDS.map((field) => {
    const aliases = HEADER_ALIASES[field].map(normalized);
    return [field, values.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)))];
  })) as Record<PostImportField, number>;
}

export function parseTags(value: unknown, content?: unknown): string[] {
  const raw = String(value ?? "");
  const hashed = raw.match(/#[^\s#，,。！？!?；;]+/g)?.map((tag) => tag.slice(1)) ?? [];
  const explicit = hashed.length ? hashed : raw.split(/[,，、;；\n]+/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  const inferred = String(content ?? "").match(/#[^\s#，,。！？!?；;]+/g)?.map((tag) => tag.slice(1)) ?? [];
  return Array.from(new Set(explicit.length ? explicit : inferred));
}

export function postExternalId(platform: string, explicit: unknown, url: unknown, title: unknown, publishedAt: unknown) {
  const direct = String(explicit ?? "").trim() || String(url ?? "").trim();
  if (direct) return direct;
  return "derived-" + createHash("sha256").update([platform, title, publishedAt].map((v) => String(v ?? "").trim()).join("|")).digest("hex").slice(0, 20);
}

export function metricRate(numerator: number | null | undefined, views: number | null | undefined) {
  if (numerator == null || !views) return null;
  return Number(((numerator / views) * 100).toFixed(2));
}

export function median(values: (number | null | undefined)[]) {
  const sorted = values.filter((value): value is number => value != null && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
}
