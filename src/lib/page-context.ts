/**
 * 页面上下文 registry。每个 app 页面 export 一个 PageContext，
 * 浮窗在路由切换时读这个字典，让助手"知道当前页能录什么、解什么、跳到哪"。
 *
 * 注册不是强制的；浮窗 fallback 用 path 猜一个最小 hint。
 * ponytail: 静态字典，不引入 Context/Zustand，单文件 + 一处 import 解决。
 */

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

/** 给 LLM 的 system prompt 注入块（≤400 字符）。 */
export function contextHint(pathname: string): string {
  const ctx = getContext(pathname);
  const lines: string[] = [`当前页: ${ctx.label} (${pathname})`];
  if (ctx.canWrite.length) lines.push(`可录入: ${ctx.canWrite.join("/")}`);
  if (ctx.hints?.length) lines.push(`常见任务: ${ctx.hints.join("；")}`);
  if (ctx.next?.length) lines.push(`推荐跳转: ${ctx.next.map((n) => `${n.label}→${n.path}`).join("；")}`);
  return lines.join("\n");
}