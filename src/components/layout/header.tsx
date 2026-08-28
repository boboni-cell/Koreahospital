"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

const TITLES: Record<string, string> = {
  "/": "首页仪表盘",
  "/today": "今日待发",
  "/calendar": "内容排期",
  "/contents": "内容管理",
  "/contents/ai": "AI 文案工坊",
  "/contents/research": "选题研究",
  "/assets": "素材库",
  "/data": "数据看板",
  "/hospital": "医院管理",
  "/accounts": "账号矩阵",
  "/sop": "SOP 中心",
  "/settings": "系统设置",
};

export function Header() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ||
    NAV_ITEMS.find((i) => pathname.startsWith(i.href))?.label ||
    "工作台";
  return (
    <header className="sticky top-0 z-30 ml-[68px] flex h-14 items-center border-b border-zinc-200 bg-white/80 px-5 backdrop-blur">
      <h1 className="text-base font-semibold tracking-tight text-zinc-800">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
        <span className="pill bg-zinc-100 text-zinc-500">演示模式</span>
      </div>
    </header>
  );
}
