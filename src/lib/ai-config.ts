import fs from "node:fs/promises";
import path from "node:path";

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "ai-config.json");

const DEFAULT_CONFIG: AiConfig = {
  baseUrl: "https://api.moonshot.cn/v1/chat/completions",
  apiKey: "",
  model: "kimi-k3",
  enabled: false,
};

export async function readAiConfig(): Promise<AiConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeAiConfig(cfg: AiConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}
