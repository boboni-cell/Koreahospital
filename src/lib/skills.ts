import fs from "node:fs/promises";
import path from "node:path";
import { parseJsonBlock } from "./ai-client.ts";
import { chatCompleteForAgent } from "./agent-llm.ts";
import { getAgentModel } from "./agent-models.ts";

/** 一个 skill 的来源：本地 skills/ 目录（SKILL.md 或 .md，支持 YAML frontmatter） */
export interface SkillEntry {
  id: string; // 文件名 slug
  slug: string;
  name: string;
  description: string;
  trigger: string[]; // 命中关键词
  tier: "always" | "dynamic"; // always=高频静态挂载；dynamic=长尾由模型动态挑
  content: string; // 正文
  frontmatter: string;
}

const SKILLS_DIR = path.join(process.cwd(), "skills");

/** 解析简单 YAML frontmatter（key: value 或 key: [a,b,c]） */
function parseFrontmatter(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([^:#]+?)\s*:\s*(.+)\s*$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

async function readSkillFile(abs: string): Promise<SkillEntry | null> {
  const raw = await fs.readFile(abs, "utf-8");
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};
  const content = fmMatch ? raw.slice(fmMatch[0].length) : raw;
  // 标准布局用父目录名作为 id（skills/<slug>/SKILL.md）；扁平 .md 用文件名
  const parent = path.basename(path.dirname(abs));
  const base = path.basename(abs, path.extname(abs));
  const fullBase = path.basename(abs);
  const slug = /^skill\.md$/i.test(fullBase) ? parent : base;
  if (!content.trim()) return null;
  return {
    id: fm.slug || slug,
    slug,
    name: fm.name || slug,
    description: fm.description || "",
    trigger: (fm.trigger || "").split(/[,\s]+/).filter(Boolean),
    tier: fm.tier === "always" ? "always" : "dynamic",
    content: content.trim(),
    frontmatter: fmMatch ? fmMatch[1].trim() : "",
  };
}

async function walkSkills(dir: string): Promise<string[]> {
  let out: string[] = [];
  try {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // 只认标准 skill 目录：含 SKILL.md 的文件夹；references/、scripts/ 不伪造成独立 skill
        if (/^skill\.md$/i.test(e.name)) {
          out.push(full);
          continue;
        }
        if (e.name === "references" || e.name === "scripts" || e.name === "assets") {
          continue; // 辅助目录跳过
        }
        out.push(...(await walkSkills(full)));
      } else if (/^skill\.md$/i.test(e.name)) {
        out.push(full);
      }
    }
  } catch {
    /* 目录不存在 */
  }
  return out;
}

/** 扫描 skills/ 目录，返回全部 skill */
export async function listSkills(): Promise<SkillEntry[]> {
  try {
    const files = await walkSkills(SKILLS_DIR);
    const all: SkillEntry[] = [];
    for (const f of files) {
      const s = await readSkillFile(f);
      if (s) all.push(s);
    }
    return all;
  } catch {
    return [];
  }
}

export async function getSkill(id: string): Promise<SkillEntry | null> {
  const all = await listSkills();
  return all.find((s) => s.id === id || s.slug === id) ?? null;
}

/** 暴露给前端/模型的紧凑目录（不含正文，省 token） */
export function catalog(all: SkillEntry[]) {
  return all.map(({ id, name, description, tier }) => ({ id, name, description, tier }));
}

/**
 * 混合 skill 选择器 core：
 * - tier=always 的 skill 永远注入（高频，零判断）
 * - tier=dynamic 的 skill 由模型按任务从目录挑选（本次仅返回选中 id）
 */
export async function selectSkillIds(
  task: string,
  input: Record<string, unknown> = {},
  preferIds: string[] = []
): Promise<{ ids: string[]; modelPowered: boolean }> {
  const all = await listSkills();
  const always = all.filter((s) => s.tier === "always");
  const dynamic = all.filter((s) => s.tier === "dynamic");

  // 平台专属 skill（你添加的）优先：只要存在就必带
  const prefer = preferIds
    .map((id) => all.find((s) => s.id === id || s.slug === id))
    .filter((s): s is SkillEntry => !!s);

  const alwaysIds = Array.from(
    new Set([...always.map((s) => s.id), ...prefer.map((s) => s.id)])
  );
  if (dynamic.length === 0) return { ids: alwaysIds, modelPowered: true };

  // 由 strategist Agent 决策；该角色为 mock 时直接全量 dynamic 兜底（保守）
  const strategist = getAgentModel("strategist");
  if (strategist.is_mock || !strategist.api_key || !strategist.base_url || strategist.base_url.startsWith("mock://")) {
    return { ids: Array.from(new Set([...alwaysIds, ...dynamic.map((s) => s.id)])), modelPowered: false };
  }

  try {
    const catText = dynamic.map((s, i) => `${i}. [${s.id}] ${s.name}：${s.description}`).join("\n");
    const text = await chatCompleteForAgent(
      "strategist",
      [
        {
          role: "system",
          content:
            "你是 skill 调度器。根据给定任务，从可用 skill 中选择需要加载的。只输出一个 JSON 数组，元素是编号字符串，不要解释。",
        },
        {
          role: "user",
          content: `任务：${task}\n额外信息：${JSON.stringify(input)}\n\n可用动态 skill：\n${catText}\n\n输出形如 ["0","3"]`,
        },
      ],
      { maxTokens: 200, timeoutMs: 45000 }
    );
    const idx = parseJsonBlock<string[]>(text);
    const chosen = idx
      .map((i) => dynamic[Number(i)])
      .filter((s): s is SkillEntry => !!s)
      .map((s) => s.id);
    return { ids: Array.from(new Set([...alwaysIds, ...chosen])), modelPowered: true };
  } catch (e) {
    console.error("skill 动态选择失败，退化为全量 dynamic", e);
    return { ids: Array.from(new Set([...alwaysIds, ...dynamic.map((s) => s.id)])), modelPowered: false };
  }
}

/** 取一组 id 的正文（拼接注入）。maxChars 控制注入上限，防止大 skill 撑爆 prompt。 */
export async function resolveContents(
  ids: string[],
  maxChars = 6000
): Promise<string> {
  const all = await listSkills();
  const byId = new Map(all.map((s) => [s.id, s]));
  let joined = "";
  for (const id of ids) {
    const c = byId.get(id)?.content;
    if (c) joined += (joined ? "\n\n---\n\n" : "") + c;
    if (joined.length >= maxChars) break;
  }
  return joined.slice(0, maxChars);
}

export async function injectSkillsForTask(
  task: string,
  input: Record<string, unknown> = {},
  preferIds: string[] = [],
  maxChars = 6000
): Promise<string> {
  try {
    const { ids } = await selectSkillIds(task, input, preferIds);
    return await resolveContents(ids, maxChars);
  } catch (e) {
    console.error("[injectSkillsForTask] 失败,降级空注入", e);
    return "";
  }
}
