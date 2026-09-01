/**
 * 页面上下文 registry。每个 app 页面 export 一个 PageContext，
 * 浮窗在路由切换时读这个字典，让助手"知道当前页能录什么、解什么、跳到哪"。
 *
 * 注册不是强制的；浮窗 fallback 用 path 猜一个最小 hint。
 * ponytail: 静态字典，不引入 Context/Zustand，单文件 + 一处 import 解决。
 */

export interface PageField {
  /** 表名（用于 draft.table 与 PUT/POST 路径） */
  table: string;
  /** 字段名 */
  name: string;
  /** 字段中文标签 + 简短 hint（"昵称/账号名"），LLM 识别用 */
  label: string;
  /** 类型提示，影响 LLM 提取方式 */
  type: "text" | "int" | "enum" | "datetime";
  /** 枚举值白名单（platform/role/status 等） */
  enum?: string[];
  /** 是否必填 */
  required?: boolean;
}

export interface PageContext {
  /** 路径匹配前缀（如 "/accounts"），缺省按文件名 */
  path?: string;
  /** 中文标签，浮窗 header 显示 */
  label: string;
  /** 此页可录入的实体类型（决定浮窗给出"录入 X"的快捷按钮） */
  canWrite: ("account" | "topic" | "content" | "signal" | "competitor" | "asset" | "brief")[];
  /** 此页常见问题（让助手默认走该 skill） */
  hints?: string[];
  /** 推荐跳转（"想发笔记，去 /production"） */
  next?: { label: string; path: string }[];
  /** 此页可录入字段 schema（截图 OCR 严格按此填） */
  fields?: PageField[];
  /** 浮窗侧栏快速按钮文案（与 fields 配对） */
  quickActions?: { label: string; prompt: string }[];
}

const ALL: PageContext[] = [];

/** 页面 export 时调用一次。重复注册以最后一个为准。 */
export function register(ctx: PageContext): void {
  const i = ctx.path ? ALL.findIndex((c) => c.path === ctx.path) : -1;
  if (i >= 0) ALL[i] = ctx; else ALL.push(ctx);
}

/** 浮窗调用：根据当前 pathname 返回最佳匹配。fallback 用 path 前缀猜。 */
export function getContext(pathname: string): PageContext {
  const exact = ALL.find((c) => c.path === pathname);
  if (exact) return exact;
  const prefix = ALL.filter((c) => c.path && pathname.startsWith(c.path))
    .sort((a, b) => (b.path!.length - a.path!.length))[0];
  if (prefix) return prefix;
  return { label: pathname || "工作台", canWrite: [] };
}

/** 给 LLM 的 system prompt 注入块（≤600 字符）。 */
export function contextHint(pathname: string): string {
  const ctx = getContext(pathname);
  const lines: string[] = [`当前页: ${ctx.label} (${pathname})`];
  if (ctx.canWrite.length) lines.push(`可录入: ${ctx.canWrite.join("/")}`);
  if (ctx.hints?.length) lines.push(`常见任务: ${ctx.hints.join("；")}`);
  if (ctx.next?.length) lines.push(`推荐跳转: ${ctx.next.map((n) => `${n.label}→${n.path}`).join("；")}`);
  if (ctx.fields?.length) {
    // 紧凑 JSON 让 LLM 严格按字段填 draft
    lines.push(`字段白名单(JSON): ${JSON.stringify(ctx.fields.map((f) => ({ table: f.table, name: f.name, label: f.label, type: f.type, enum: f.enum, required: !!f.required })))}`);
  }
  return lines.join("\n");
}

/** 截图场景专用：只输出字段白名单 JSON，省 token 更精准。 */
export function ocrSchemaHint(pathname: string): string {
  const ctx = getContext(pathname);
  if (!ctx.fields?.length) return "";
  return `【字段白名单】截图识别必须严格按以下 JSON 字段填 draft，禁止自定义字段：\n${JSON.stringify(ctx.fields)}`;
}