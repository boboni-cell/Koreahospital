"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);

  return (
    <aside
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-zinc-50 py-3 transition-[width] duration-200",
        hover ? "w-[228px]" : "w-[68px]"
      )}
    >
      <div className="mb-4 flex items-center gap-2 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-400 text-sm font-bold text-white">
          H
        </div>
        {hover && (
          <span className="truncate text-sm font-semibold text-zinc-800">
            毛发矩阵工作台
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="space-y-1">
              {hover && (
                <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  {group}
                </div>
              )}
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
                      active
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-rose-400" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {hover && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
