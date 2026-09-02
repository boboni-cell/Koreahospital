export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

/**
 * 通用 OpenAI 兼容 chat 调用。
 * 兼容推理模型（如 kimi-k3）：reasoning_content 有内容时回退读取。
 */
export async function chatComplete(
  messages: ChatMessage[],
  config: AiConfig,
  opts: ChatOptions = {}
): Promise<string> {
  if (!config.enabled) throw new Error("AI 未启用");
  if (!config.apiKey || !config.baseUrl) throw new Error("模型未配置");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45000);
  try {
    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: opts.maxTokens ?? 1200,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`模型返回 ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const msg = data.choices?.[0]?.message;
    const content = (msg?.content || msg?.reasoning_content || "").trim();
    if (!content) throw new Error("模型返回空内容");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从文本中稳健提取 JSON 对象/数组（兼容模型附带解释、思考过程、markdown 围栏）。
 */
export function parseJsonBlock<T = unknown>(text: string): T {
  if (!text) throw new Error("空文本无法解析 JSON");
  const candidates = [text.trim(), ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (match) => match[1].trim())];
  let lastError = "未找到完整 JSON 对象";
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as T; } catch (error) { lastError = String((error as Error).message); }
    for (let start = 0; start < candidate.length; start += 1) {
      const opener = candidate[start];
      if (opener !== "{" && opener !== "[") continue;
      const closer = opener === "{" ? "}" : "]";
      let depth = 0; let quoted = false; let escaped = false;
      for (let end = start; end < candidate.length; end += 1) {
        const char = candidate[end];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') quoted = false;
          continue;
        }
        if (char === '"') quoted = true;
        else if (char === opener) depth += 1;
        else if (char === closer && --depth === 0) {
          try { return JSON.parse(candidate.slice(start, end + 1)) as T; } catch (error) { lastError = String((error as Error).message); }
          break;
        }
      }
    }
  }
  throw new Error(`JSON 解析失败：${lastError.slice(0, 160)}`);
}
