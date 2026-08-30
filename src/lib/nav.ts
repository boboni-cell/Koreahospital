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
  Boxes,
  BookOpen,
  Settings,
  PlusCircle,
  MessageSquare,
  FileBarChart,
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
  { label: "运营中心", href: "/ops", icon: Send, group: "运营" },
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
  { label: "模型管理", href: "/settings/models", icon: Boxes, group: "系统" },
  { label: "SOP 中心", href: "/sop", icon: BookOpen, group: "系统" },
  { label: "系统设置", href: "/settings", icon: Settings, group: "系统" },
];

export const NAV_GROUPS = ["总览", "运营", "素材", "数据", "医院", "系统"];
