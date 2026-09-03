import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_TEXT = 120_000;
const PLATFORM_HOSTS: Array<[string, string]> = [
  ["xiaohongshu", "xiaohongshu.com"], ["douyin", "douyin.com"], ["bilibili", "bilibili.com"],
  ["weibo", "weibo.com"], ["zhihu", "zhihu.com"], ["wechat", "mp.weixin.qq.com"],
  ["youtube", "youtube.com"], ["youtube", "youtu.be"], ["tiktok", "tiktok.com"],
  ["x", "x.com"], ["x", "twitter.com"],
];

export interface ChubbyResearchMaterial {
  platform: string;
  externalId: string | null;
  sourceUrl: string;
  title: string;
  author: string | null;
  publishedAt: string | null;
  text: string;
  media: { type: string | null; assets: string[] };
  metrics: Record<string, number>;
  fetchedAt: string;
  evidence: string;
  raw: Record<string, unknown>;
}

export function chubbySkillsConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.CHUBBYSKILLS_DIR?.trim());
}

export function sourcePlatform(source: string) {
  let host: string;
  try { host = new URL(source).hostname.toLowerCase(); } catch { return null; }
  return PLATFORM_HOSTS.find(([, suffix]) => host === suffix || host.endsWith(`.${suffix}`))?.[0] ?? null;
}

export function validateChubbySource(source: string) {
  try {
    const url = new URL(source);
    if (!/^https?:$/.test(url.protocol)) return "只允许 http(s) 公开链接";
    if (!sourcePlatform(source)) return "暂不支持该平台链接";
    return null;
  } catch { return "请输入有效的公开链接"; }
}

function parseScalar(value: string) {
  const trimmed = value.trim();
  return trimmed.replace(/^("|')(.*)\1$/, "$2");
}

export function parseChubbyMarkdown(markdown: string, sourceUrl: string): ChubbyResearchMaterial {
  const boundary = markdown.startsWith("---\n") ? markdown.indexOf("\n---", 4) : -1;
  const frontmatter: Record<string, string> = {};
  const body = boundary >= 0 ? markdown.slice(boundary + 4).trim() : markdown.trim();
  if (boundary >= 0) {
    for (const line of markdown.slice(4, boundary).split("\n")) {
      const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (match) frontmatter[match[1]] = parseScalar(match[2]);
    }
  }
  const metrics: Record<string, number> = {};
  for (const key of ["likes", "collects", "comments", "replies", "views"]) {
    const value = Number(frontmatter[key]);
    if (Number.isFinite(value)) metrics[key] = value;
  }
  const assets = frontmatter.assets?.replace(/^\[|\]$/g, "").split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  const text = body.slice(0, MAX_TEXT);
  return {
    platform: frontmatter.platform || sourcePlatform(sourceUrl) || "unknown",
    externalId: frontmatter.run_id || frontmatter.source_hash || null,
    sourceUrl, title: frontmatter.title || sourceUrl, author: frontmatter.author || null,
    publishedAt: frontmatter.created || null, text,
    media: { type: frontmatter.note_type || frontmatter.content_type || null, assets }, metrics,
    fetchedAt: frontmatter.processed_at || frontmatter.captured_at || new Date().toISOString(),
    evidence: `ChubbySkills ${frontmatter.status || "unknown"}：${frontmatter.content_type || frontmatter.type || "research material"}`,
    raw: { frontmatter, text },
  };
}

export async function ingestWithChubbySkills(source: string, fallbackText?: string): Promise<ChubbyResearchMaterial> {
  const sourceError = validateChubbySource(source);
  if (sourceError) throw new Error(sourceError);
  const root = process.env.CHUBBYSKILLS_DIR?.trim();
  if (!root) throw new Error("未配置 CHUBBYSKILLS_DIR，请先部署 ChubbySkills");
  const script = path.join(root, "tools", "chubby_ingest.py");
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "koreahospital-chubby-"));
  try {
    const args = [script, source, "--output", workDir];
    if (sourcePlatform(source) === "xiaohongshu") {
      args.push("--no-images");
      if (fallbackText?.trim()) {
        const fallbackPath = path.join(workDir, "fallback.txt");
        await fs.writeFile(fallbackPath, fallbackText.slice(0, MAX_TEXT), "utf8");
        args.push("--fallback-text", fallbackPath);
      }
    }
    const { stdout } = await execFileAsync(process.env.CHUBBYSKILLS_PYTHON || "python3", args, {
      cwd: root, env: { ...process.env, KOREAHOSPITAL_READ_ONLY: "1" }, timeout: 120_000, maxBuffer: 300_000,
    });
    const outputPath = stdout.trim().split("\n").pop()?.trim();
    if (!outputPath) throw new Error("ChubbySkills 未返回 Markdown 输出");
    const markdown = await fs.readFile(path.resolve(root, outputPath), "utf8").catch(() => fs.readFile(path.resolve(workDir, outputPath), "utf8"));
    return parseChubbyMarkdown(markdown, source);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
