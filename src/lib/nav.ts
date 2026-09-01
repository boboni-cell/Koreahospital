import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  FileBarChart,
  FileText,
  FolderKanban,
  Image,
  Images,
  Lightbulb,
  ListTodo,
  MessageSquare,
  PlusCircle,
  Radar,
  Send,
  Settings,
  Sparkles,
  Stethoscope,
  Target,
  Upload,
  Users,
  WandSparkles,
} from "lucide-react";

export interface NavChild {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  children?: NavChild[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "运营工作台", shortLabel: "工作台", description: "今天从这里开始", href: "/workbench", icon: FolderKanban, exact: true },
  {
    label: "内容生产", shortLabel: "生产", description: "信号、选题与创作", href: "/production", icon: Sparkles,
    children: [
      { label: "选题池", href: "/topics", icon: Lightbulb },
      { label: "选题研究", href: "/contents/research", icon: Lightbulb },
      { label: "AI 文案工坊", href: "/contents/ai", icon: MessageSquare },
      { label: "单篇生产", href: "/production", icon: WandSparkles },
      { label: "Agent 合同", href: "/agent-contracts", icon: FileText },
    ],
  },
  {
    label: "内容管理", shortLabel: "内容", description: "草稿、待发与发布", href: "/contents", icon: FileText,
    children: [
      { label: "今日待发", href: "/today", icon: Send },
      { label: "内容列表", href: "/contents", icon: FileText },
      { label: "新建内容", href: "/contents/new", icon: PlusCircle },
      { label: "内容知识库", href: "/knowledge", icon: BookOpen },
    ],
  },
  {
    label: "素材中心", shortLabel: "素材", description: "素材模板与授权", href: "/assets", icon: Image,
    children: [
      { label: "素材库", href: "/assets", icon: Images },
      { label: "AI 生成配图", href: "/assets/generate", icon: Sparkles },
      { label: "批量上传", href: "/assets/upload", icon: Upload },
    ],
  },
  { label: "排期发布", shortLabel: "排期", description: "日历与待发布", href: "/calendar", icon: CalendarDays },
  {
    label: "数据中心", shortLabel: "数据", description: "帖子、账号与复盘", href: "/data/posts", icon: BarChart3,
    children: [
      { label: "帖子分析", href: "/data/posts", icon: FileText },
      { label: "复盘报告", href: "/data/reports", icon: FileBarChart },
      { label: "账号数据", href: "/data", icon: BarChart3 },
      { label: "账号定位", href: "/data/positioning", icon: Target },
      { label: "信息源", href: "/data/sources", icon: Radar },
    ],
  },
  {
    label: "医院协作", shortLabel: "医院", description: "医院模板与任务", href: "/hospital/schedule", icon: Stethoscope,
    children: [
      { label: "日程管理", href: "/hospital/schedule", icon: CalendarDays },
      { label: "任务看板", href: "/hospital/tasks", icon: ListTodo },
      { label: "沟通记录", href: "/hospital/notes", icon: MessageSquare },
    ],
  },
  { label: "SOP 中心", shortLabel: "SOP", description: "标准流程与规范", href: "/sop", icon: BookOpen },
  { label: "执行计划", shortLabel: "计划", description: "总 Agent 的协作 plan", href: "/plans", icon: ListTodo },
  { label: "账号矩阵", shortLabel: "账号", description: "管理所有平台账号与定位", href: "/accounts", icon: Users },
];

export const SETTINGS_ITEM: NavItem = {
  label: "系统设置",
  shortLabel: "设置",
  description: "账号、模型与权限",
  href: "/settings",
  icon: Settings,
  children: [
    { label: "系统设置", href: "/settings", icon: Settings },
    { label: "Agent 模型", href: "/settings/agent-models", icon: Bot },
    { label: "图像/视频", href: "/settings/media-models", icon: Image },
  ],
};

export const ROUTE_TITLES: Record<string, string> = {
  "/": "运营工作台",
  "/workbench": "运营工作台",
  "/ops": "运营工作台",
  "/today": "今日待发",
  "/calendar": "排期发布",
  "/contents": "内容管理",
  "/contents/new": "新建内容",
  "/contents/ai": "AI 文案工坊",
  "/contents/research": "选题研究",
  "/production": "内容生产",
  "/assets": "素材中心",
  "/assets/generate": "AI 生成配图",
  "/assets/upload": "批量上传",
  "/topics": "选题池",
  "/signals": "平台信号池",
  "/knowledge": "内容知识库",
  "/data": "数据看板",
  "/data/posts": "帖子分析",
  "/data/posts/import": "导入帖子数据",
  "/data/reports": "复盘报告",
  "/data/positioning": "账号定位",
  "/data/sources": "信息源",
  "/data/input": "数据录入",
  "/data/report": "报表中心",
  "/review": "数据复盘",
  "/project": "项目简报",
  "/accounts": "账号矩阵",
  "/agent-contracts": "Agent 合同",
  "/hospital/schedule": "医院日程",
  "/hospital/tasks": "任务看板",
  "/hospital/notes": "沟通记录",
  "/sop": "SOP 中心",
  "/plans": "执行计划",
  "/settings": "系统设置",
};
