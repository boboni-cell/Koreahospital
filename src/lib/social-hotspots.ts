import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import type { HotspotItem } from "./daily-hotspots";

type SocialPlatform = "rednote" | "douyin";

export function normalizeSocaiHotspots(platform: SocialPlatform, payload: unknown): HotspotItem[] {
  const root = payload as any;
  const cards = Array.isArray(root?.cards) ? root.cards : [];
  return cards.map((card: any, index: number) => ({
    rank: Number(card.position ?? card.rank) || index + 1,
    title: String(card.title ?? "").trim(),
    hotValue: String(card.likes ?? card.like_count ?? card.hot_value ?? ""),
    link: String(card.url ?? card.note_url ?? card.link ?? ""),
    detail: String(card.author ?? card.author_name ?? ""),
    cover: String(card.cover_url ?? card.cover ?? ""),
  })).filter((item: HotspotItem) => item.title).slice(0, 30).map((item: HotspotItem, index: number) => ({ ...item, rank: index + 1 }));
}

function parseSocaiJson(output: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("socai 没有返回 JSON");
  return JSON.parse(output.slice(start, end + 1));
}

function runSocai(binary: string, args: string[], timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("socai 实时采集超时")); }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `socai 退出码 ${code}`));
      resolve(stdout);
    });
  });
}

export async function fetchSocaiHotspots(platform: SocialPlatform, query: string, options: { timeoutMs?: number } = {}) {
  const binary = process.env.SOCAI_BIN?.trim() || (existsSync("/Users/zhanghanyue/.socai/bin/socai") ? "/Users/zhanghanyue/.socai/bin/socai" : "socai");
  const args = platform === "rednote"
    ? ["xhs", "search", query, "--preview", "--num-notes", "20", "--pretty"]
    : ["dy", "search", query, "--num", "20", "--wait-seconds", "60", "--pretty"];
  const payload = parseSocaiJson(await runSocai(binary, args, options.timeoutMs || 90_000));
  if (payload.ok === false) throw new Error(payload.reason || "socai 没有返回结果");
  const items = normalizeSocaiHotspots(platform, payload);
  if (!items.length) throw new Error("socai 没有找到匹配内容");
  return items;
}
