// 内置平台模板。chat = chat completions 根地址；image/video = 图像/视频端点。
// 国内平台不出现国际域名，符合用户红线。

export type ProviderId =
  | "mock"
  | "openai"
  | "deepseek"
  | "kimi"
  | "volcengine"
  | "doubao"
  | "qwen"
  | "zhipu"
  | "hunyuan"
  | "dashscope"
  | "siliconflow"
  | "moyu"
  | "agnes"
  | "atlascloud"
  | "fal"
  | "openrouter"
  | "minimax"
  | "minimax-cn"
  | "nanogpt"
  | "custom";

/** image/video 端点的「协议风格」 */
export type ImageStyle = "openai" | "atlas" | "fal" | "none";
export type VideoStyle = "openai" | "atlas" | "fal" | "ark-task" | "none";

export interface ProviderTemplate {
  id: ProviderId;
  /** 中文显示名 */
  label: string;
  /** 备注（适用范围、是否国内等） */
  desc: string;
  /** chat completions 根地址（拼 /chat/completions）。custom/mock 时可空。 */
  chat: string;
  /** 图像端点根地址。空串 = 不支持。 */
  image: string;
  imageStyle: ImageStyle;
  /** 视频端点根地址。空串 = 不支持。 */
  video: string;
  videoStyle: VideoStyle;
  /** 推荐默认模型名（拉取失败时兜底） */
  defaultModel: string;
  /** 是否为国内平台（仅 UI 标记，不影响逻辑） */
  domestic: boolean;
  /** kind 默认值 */
  kind: "text" | "image" | "video";
}

export const PROVIDERS: Record<ProviderId, ProviderTemplate> = {
  mock: {
    id: "mock",
    label: "Mock1（占位，不发请求）",
    desc: "未配置真实模型时的兜底",
    chat: "mock://local",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "mock-1",
    domestic: true,
    kind: "text",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    desc: "国际；gpt-4o / gpt-image-1 / sora 等",
    chat: "https://api.openai.com/v1",
    image: "https://api.openai.com/v1",
    imageStyle: "openai",
    video: "https://api.openai.com/v1",
    videoStyle: "openai",
    defaultModel: "gpt-4o-mini",
    domestic: false,
    kind: "text",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek（深度求索）",
    desc: "国内；文本（不支持图像/视频）",
    chat: "https://api.deepseek.com/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "deepseek-chat",
    domestic: true,
    kind: "text",
  },
  kimi: {
    id: "kimi",
    label: "Kimi（Moonshot 月之暗面）",
    desc: "国内；文本（不支持图像/视频）",
    chat: "https://api.moonshot.cn/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "kimi-k2-0711-preview",
    domestic: true,
    kind: "text",
  },
  volcengine: {
    id: "volcengine",
    label: "火山方舟（豆包）",
    desc: "国内；doubao 文本/图像/视频；视频走方舟异步任务",
    chat: "https://ark.cn-beijing.volces.com/api/v3",
    image: "https://ark.cn-beijing.volces.com/api/v3",
    imageStyle: "openai",
    video: "https://ark.cn-beijing.volces.com/api/v3",
    videoStyle: "ark-task",
    defaultModel: "doubao-seed-1-6-250615",
    domestic: true,
    kind: "text",
  },
  doubao: {
    id: "doubao",
    label: "豆包（方舟图像/视频）",
    desc: "国内；图像走 doubao-seedream，视频走 doubao-seedance（方舟异步）",
    chat: "https://ark.cn-beijing.volces.com/api/v3",
    image: "https://ark.cn-beijing.volces.com/api/v3",
    imageStyle: "openai",
    video: "https://ark.cn-beijing.volces.com/api/v3",
    videoStyle: "ark-task",
    defaultModel: "doubao-seedream-3-0-t2i-250415",
    domestic: true,
    kind: "image",
  },
  qwen: {
    id: "qwen",
    label: "通义千问（阿里百炼 Qwen）",
    desc: "国内；含 qwen-image、qwen-vl-image；endpoint 需带 WorkspaceId",
    chat: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    image: "https://dashscope.aliyuncs.com/api/v1",
    imageStyle: "openai",
    video: "",
    videoStyle: "none",
    defaultModel: "qwen-plus",
    domestic: true,
    kind: "text",
  },
  zhipu: {
    id: "zhipu",
    label: "智谱（GLM）",
    desc: "国内；glm-4 / glm-5.x，文本/图像（cogview）",
    chat: "https://open.bigmodel.cn/api/paas/v4",
    image: "https://open.bigmodel.cn/api/paas/v4",
    imageStyle: "openai",
    video: "",
    videoStyle: "none",
    defaultModel: "glm-4.6",
    domestic: true,
    kind: "text",
  },
  hunyuan: {
    id: "hunyuan",
    label: "腾讯混元",
    desc: "国内；hunyuan-turbos-latest / hunyuan-vision",
    chat: "https://api.hunyuan.cloud.tencent.com/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "hunyuan-turbos-latest",
    domestic: true,
    kind: "text",
  },
  dashscope: {
    id: "dashscope",
    label: "阿里云百炼（DashScope）",
    desc: "国内；兼容模式 endpoint，需带 WorkspaceId",
    chat: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "qwen-plus",
    domestic: true,
    kind: "text",
  },
  siliconflow: {
    id: "siliconflow",
    label: "硅基流动（SiliconFlow）",
    desc: "国内；托管 Qwen/DeepSeek/Kimi/GLM 等开源模型",
    chat: "https://api.siliconflow.cn/v1",
    image: "https://api.siliconflow.cn/v1",
    imageStyle: "openai",
    video: "https://api.siliconflow.cn/v1",
    videoStyle: "openai",
    defaultModel: "Qwen/Qwen2.5-72B-Instruct",
    domestic: true,
    kind: "text",
  },
  moyu: {
    id: "moyu",
    label: "魔芋（moyu.info）",
    desc: "国内；端点见官网（无公开 OpenAI 兼容文档，需在「自定义」中手动填）",
    chat: "",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "",
    domestic: true,
    kind: "text",
  },
  agnes: {
    id: "agnes",
    label: "Agnes（agnes.ai）",
    desc: "国内；按官网文档（无公开 OpenAI 兼容文档，建议用「自定义」）",
    chat: "",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "",
    domestic: true,
    kind: "text",
  },
  atlascloud: {
    id: "atlascloud",
    label: "Atlas Cloud",
    desc: "图像/视频：generateImage / generateVideo；文本走 OpenAI 兼容 /v1",
    chat: "https://api.atlascloud.ai/v1",
    image: "https://api.atlascloud.ai/api/v1",
    imageStyle: "atlas",
    video: "https://api.atlascloud.ai/api/v1",
    videoStyle: "atlas",
    defaultModel: "seedream-3.0",
    domestic: true,
    kind: "image",
  },
  fal: {
    id: "fal",
    label: "fal.ai",
    desc: "国际；异步队列（queue.fal.run/{model}）；本版 UI 仅支持拉取模型列表，自动生成走自定义或后续轮次",
    chat: "",
    image: "https://queue.fal.run",
    imageStyle: "fal",
    video: "https://queue.fal.run",
    videoStyle: "fal",
    defaultModel: "fal-ai/flux/schnell",
    domestic: false,
    kind: "image",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter（聚合）",
    desc: "国际聚合站，按 model 字段路由；图像走 /images/generations",
    chat: "https://openrouter.ai/api/v1",
    image: "https://openrouter.ai/api/v1",
    imageStyle: "openai",
    video: "",
    videoStyle: "none",
    defaultModel: "openai/gpt-4o-mini",
    domestic: false,
    kind: "text",
  },
  minimax: {
    id: "minimax",
    label: "MiniMax（国际）",
    desc: "国际 endpoint；国内访问需自备代理",
    chat: "https://api.minimax.io/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "MiniMax-M1",
    domestic: false,
    kind: "text",
  },
  "minimax-cn": {
    id: "minimax-cn",
    label: "MiniMax（国内）",
    desc: "国内入口（minimaxi.com 平台）；先用 platform.MiniMax.io 同 endpoint，国内访问需自备网络",
    chat: "https://api.minimax.io/v1",
    image: "",
    imageStyle: "none",
    video: "",
    videoStyle: "none",
    defaultModel: "MiniMax-M1",
    domestic: true,
    kind: "text",
  },
  nanogpt: {
    id: "nanogpt",
    label: "NanoGPT",
    desc: "国际聚合代理",
    chat: "https://nano-gpt.com/api/v1",
    image: "https://nano-gpt.com/api/v1",
    imageStyle: "openai",
    video: "",
    videoStyle: "none",
    defaultModel: "gpt-4o-mini",
    domestic: false,
    kind: "text",
  },
  custom: {
    id: "custom",
    label: "自定义（手动填 baseUrl）",
    desc: "任意 OpenAI 兼容 endpoint；图像/视频需走 OpenAI 风格 /images/generations /videos/generations",
    chat: "",
    image: "",
    imageStyle: "openai",
    video: "",
    videoStyle: "openai",
    defaultModel: "",
    domestic: true,
    kind: "text",
  },
};

export const PROVIDER_LIST: ProviderTemplate[] = Object.values(PROVIDERS);

/** 由 provider 找模板 */
export function getProvider(p: ProviderId): ProviderTemplate {
  const t = PROVIDERS[p];
  if (!t) throw new Error(`未知 provider: ${p}`);
  return t;
}

/** 由 provider 派生 chat completions 完整 URL */
export function chatUrlFor(provider: ProviderId, customBase?: string): string {
  if (provider === "mock") return "mock://local/chat/completions";
  if (provider === "custom") {
    const base = (customBase || "").trim();
    if (!base) return "";
    return base.replace(/\/$/, "") + "/chat/completions";
  }
  const tpl = getProvider(provider);
  return tpl.chat.replace(/\/$/, "") + "/chat/completions";
}

/** 拉取模型列表的完整 URL */
export function modelsUrlFor(provider: ProviderId, customBase?: string): string {
  if (provider === "mock") return "mock://local/models";
  // 火山方舟、fal、atlas 不暴露通用 /models
  if (provider === "volcengine" || provider === "fal" || provider === "atlascloud") return "";
  if (provider === "custom") {
    const base = (customBase || "").trim();
    if (!base) return "";
    return base.replace(/\/$/, "") + "/models";
  }
  const tpl = getProvider(provider);
  return tpl.chat.replace(/\/$/, "") + "/models";
}

/** 图像端点 URL（atlas 风格返回 model/generateImage；openai 风格返回 /images/generations） */
export function imageUrlFor(provider: ProviderId, model: string, customBase?: string): string {
  if (provider === "mock") return "mock://local/image";
  const tpl = getProvider(provider);
  const base = provider === "custom" ? (customBase || tpl.image || "") : tpl.image;
  if (!base) return "";
  if (tpl.imageStyle === "atlas") return base.replace(/\/$/, "") + "/model/generateImage";
  if (tpl.imageStyle === "fal") return base.replace(/\/$/, "") + "/" + model;
  return base.replace(/\/$/, "") + "/images/generations";
}

/** 视频端点 URL */
export function videoUrlFor(provider: ProviderId, model: string, customBase?: string): string {
  if (provider === "mock") return "mock://local/video";
  const tpl = getProvider(provider);
  const base = provider === "custom" ? (customBase || tpl.video || "") : tpl.video;
  if (!base) return "";
  if (tpl.videoStyle === "atlas") return base.replace(/\/$/, "") + "/model/generateVideo";
  if (tpl.videoStyle === "fal") return base.replace(/\/$/, "") + "/" + model;
  // ark-task: 火山方舟异步任务端点（创建视频任务）
  if (tpl.videoStyle === "ark-task") return base.replace(/\/$/, "") + "/contents/generations/tasks";
  return base.replace(/\/$/, "") + "/videos/generations";
}

/** 火山方舟视频任务轮询端点（GET {base}/contents/generations/tasks/{task_id}） */
export function arkVideoPollUrl(provider: ProviderId, taskId: string, customBase?: string): string {
  if (provider === "mock") return "";
  const tpl = getProvider(provider);
  const base = provider === "custom" ? (customBase || tpl.video || "") : tpl.video;
  if (!base) return "";
  return base.replace(/\/$/, "") + "/contents/generations/tasks/" + taskId;
}

/** 当 base_url 是 mock:// 开头时认为是 mock */
export function isMockBaseUrl(url: string): boolean {
  return !url || url.startsWith("mock://");
}