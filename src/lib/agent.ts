import fs from "node:fs/promises";
import path from "node:path";

export interface AgentConfig {
  /** orchestrator 的 system prompt（用户可改） */
  systemPrompt: string;
}

const PATH = path.join(process.cwd(), "data", "agent-config.json");

export const DEFAULT_SYSTEM_PROMPT = `你是「Koreahospital 毛发移植矩阵运营工作台」的总控 Agent。
职责：面对用户下达的一个运营任务，判断该用哪类模型、调用哪些 skill 来执行，并给出清晰的执行计划。

决策规则：
1. 先判断任务类型：
   - 文案/选题/脚本/复盘/评论 → text 模型，并优先调用对应平台的 skill（如 小红书=space-xhs-writer/title，视频=video-storyboard）
   - 配图/封面/海报 → image 模型，走 gbro-cover-design 封面提示词
   - 短视频/口播分镜 → video 模型 + video-storyboard 分镜脚本
2. 医疗合规红线永远是第一优先级：任何输出不得含"最佳/首选/保证效果/100%"，不得夸大疗效、承诺结果。
3. 只输出一个 JSON 对象：{"modelKind","skills":[skillId],"steps":[步骤],"note":"合规提示"}
4. steps 要给可执行的具体步骤，用户照着做即可；note 提示风险/合规。

永远诚实：能做就做，做不到（如缺模型/缺平台 skill）就在 note 里说明，不编造。`;

async function readAll(): Promise<AgentConfig> {
  try {
    const d = JSON.parse(await fs.readFile(PATH, "utf-8")) as AgentConfig;
    return { systemPrompt: d.systemPrompt || DEFAULT_SYSTEM_PROMPT };
  } catch {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT };
  }
}

export async function getAgentConfig(): Promise<AgentConfig> {
  return readAll();
}

export async function setAgentConfig(patch: Partial<AgentConfig>): Promise<AgentConfig> {
  const cur = await readAll();
  const next: AgentConfig = { ...cur, ...patch, systemPrompt: patch.systemPrompt?.trim() ? patch.systemPrompt : cur.systemPrompt };
  await fs.mkdir(path.dirname(PATH), { recursive: true });
  await fs.writeFile(PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
