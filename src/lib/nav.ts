import {
  LayoutDashboard,
  Send,
  CalendarDays,
  FileText,
  Image,
  Upload,
  Sparkles,
  Lightbulb,
  BarChart3,
  Stethoscope,
  ListTodo,
  Users,
  BookOpen,
  Settings,
  PlusCircle,
  MessageSquare,
  FileBarChart,
  Rocket,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "首页仪表盘", href: "/", icon: LayoutDashboard, group: "总览", exact: true },
  { label: "运营中心", href: "/ops", icon: Rocket, group: "运营" },
  { label: "今日待发", href: "/today", icon: Send, group: "运营" },
  { label: "内容排期", href: "/calendar", icon: CalendarDays, group: "运营" },
  { label: "内容管理", href: "/contents", icon: FileText, group: "运营" },
  { label: "新建内容", href: "/contents/new", icon: PlusCircle, group: "运营" },
  { label: "AI 文案工坊", href: "/contents/ai", icon: MessageSquare, group: "运营" },
  { label: "选题研究", href: "/contents/research", icon: Lightbulb, group: "运营" },
  { label: "素材库", href: "/assets", icon: Image, group: "素材" },
  { label: "AI 生成配图", href: "/assets/generate", icon: Sparkles, group: "素材" },
  { label: "批量上传", href: "/assets/upload", icon: Upload, group: "素材" },
  { label: "选题池", href: "/topics", icon: Lightbulb, group: "素材" },
  { label: "数据看板", href: "/data", icon: BarChart3, group: "数据" },
  { label: "数据录入", href: "/data/input", icon: PlusCircle, group: "数据" },
  { label: "报表中心", href: "/data/report", icon: FileBarChart, group: "数据" },
  { label: "日程管理", href: "/hospital/schedule", icon: Stethoscope, group: "医院" },
  { label: "任务看板", href: "/hospital/tasks", icon: ListTodo, group: "医院" },
  { label: "沟通记录", href: "/hospital/notes", icon: MessageSquare, group: "医院" },
  { label: "账号矩阵", href: "/accounts", icon: Users, group: "系统" },
  { label: "SOP 中心", href: "/sop", icon: BookOpen, group: "系统" },
  { label: "系统设置", href: "/settings", icon: Settings, group: "系统" },
];

export const NAV_GROUPS = ["总览", "运营", "素材", "数据", "医院", "系统"];

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
  "/settings": "系统设置",
};
