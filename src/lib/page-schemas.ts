/**
 * 各页字段 schema（截图 OCR 自动出 draft 用）。
 * ponytail: 静态字典,加载时自动 register 到 page-context。
 * 增改页面 = 改这一个文件,不动 page-context.ts。
 */
import { register } from "./page-context";

// accounts 表字段（对齐 src/lib/db.ts 中 accounts schema）
register({
  path: "/accounts",
  label: "账号管理",
  canWrite: ["account"],
  hints: ["录入账号", "改定位", "改环境状态", "改粉丝数"],
  next: [
    { label: "看运营总览", path: "/ops" },
    { label: "看账号活动", path: "/settings/operators" },
  ],
  fields: [
    { table: "accounts", name: "handle", label: "账号昵称(handle)", type: "text", required: true },
    { table: "accounts", name: "platform", label: "平台", type: "enum", enum: ["xiaohongshu", "douyin", "bilibili", "wechat"], required: true },
    { table: "accounts", name: "role", label: "账号角色", type: "enum", enum: ["director", "consultant", "official", "case_study", "knowledge", "viral"] },
    { table: "accounts", name: "followers", label: "粉丝数", type: "int" },
    { table: "accounts", name: "environment_status", label: "后台状态", type: "enum", enum: ["configuring", "available", "paused", "login_expired", "risk_limited", "archived"] },
    { table: "accounts", name: "positioning", label: "定位一句话", type: "text" },
    { table: "accounts", name: "status", label: "启用状态", type: "enum", enum: ["active", "paused", "archived"] },
  ],
  quickActions: [
    { label: "截图录入账号", prompt: "截图识别账号信息" },
    { label: "改定位", prompt: "改账号定位" },
  ],
});

// topics 选题
register({
  path: "/topics",
  label: "选题池",
  canWrite: ["topic"],
  hints: ["录入选题", "改热度", "改目标账号"],
  next: [
    { label: "开始做选题", path: "/production" },
    { label: "看数据", path: "/data" },
  ],
  fields: [
    { table: "topics", name: "title", label: "选题标题", type: "text", required: true },
    { table: "topics", name: "description", label: "选题说明", type: "text" },
    { table: "topics", name: "heat_score", label: "热度(1-10)", type: "int" },
    { table: "topics", name: "source", label: "来源", type: "enum", enum: ["manual", "research", "trending", "user"] },
    { table: "topics", name: "target_accounts", label: "目标账号 ID(JSON 数组)", type: "text" },
  ],
  quickActions: [
    { label: "截图录选题", prompt: "截图识别选题" },
  ],
});

// 兜底：unknown path 不报错
register({
  path: "/",
  label: "工作台",
  canWrite: [],
});

// signals 信号
register({
  path: "/signals",
  label: "信号池",
  canWrite: ["signal"],
  hints: ["录入信号", "关联账号", "触发复盘"],
  next: [
    { label: "去工作台", path: "/workbench" },
  ],
  fields: [
    { table: "signals", name: "title", label: "信号标题", type: "text", required: true },
    { table: "signals", name: "source_url", label: "来源 URL", type: "text" },
    { table: "signals", name: "platform", label: "平台", type: "enum", enum: ["xiaohongshu", "douyin", "weibo", "zhihu", "bilibili", "wechat", "other"] },
    { table: "signals", name: "evidence", label: "证据/原文摘要", type: "text" },
    { table: "signals", name: "status", label: "状态", type: "enum", enum: ["pending", "confirmed", "dismissed"] },
  ],
  quickActions: [
    { label: "截图录信号", prompt: "截图识别信号" },
  ],
});

// contents 内容
register({
  path: "/contents",
  label: "内容库",
  canWrite: ["content"],
  hints: ["新建内容", "复制变体", "改简报"],
  next: [
    { label: "去工作台", path: "/workbench" },
  ],
  fields: [
    { table: "contents", name: "title", label: "标题", type: "text", required: true },
    { table: "contents", name: "body", label: "正文", type: "text" },
    { table: "contents", name: "platform", label: "平台", type: "enum", enum: ["xiaohongshu", "douyin", "weibo", "zhihu", "bilibili", "wechat"], required: true },
    { table: "contents", name: "role", label: "账号角色", type: "enum", enum: ["director", "consultant", "official", "case_study", "knowledge", "viral"] },
    { table: "contents", name: "status", label: "状态", type: "enum", enum: ["draft", "review", "approved", "scheduled", "published", "archived"] },
    { table: "contents", name: "scheduled_for", label: "计划发布时间(ISO)", type: "datetime" },
  ],
  quickActions: [
    { label: "截图录内容", prompt: "截图识别内容" },
  ],
});

// competitors 竞品
register({
  path: "/competitors",
  label: "竞品库",
  canWrite: ["competitor"],
  hints: ["录入竞品", "更新观察", "改定位"],
  next: [
    { label: "去工作台", path: "/workbench" },
  ],
  fields: [
    { table: "competitors", name: "account", label: "竞品账号", type: "text", required: true },
    { table: "competitors", name: "platform", label: "平台", type: "enum", enum: ["xiaohongshu", "douyin", "weibo", "zhihu", "bilibili", "wechat"] },
    { table: "competitors", name: "positioning", label: "定位/打法", type: "text" },
    { table: "competitors", name: "evidence", label: "证据/原文", type: "text" },
    { table: "competitors", name: "status", label: "状态", type: "enum", enum: ["active", "archived"] },
  ],
  quickActions: [
    { label: "截图录竞品", prompt: "截图识别竞品" },
  ],
});