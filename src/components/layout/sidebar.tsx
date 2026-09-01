"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { NAV_ITEMS, SETTINGS_ITEM, type NavChild, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const INDEX_ROUTES = new Set(["/production", "/contents", "/assets", "/review", "/data", "/settings"]);

function routeMatches(pathname: string, href: string, exact = false) {
  if (href === "/") return pathname === "/";
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function childActive(pathname: string, child: NavChild) {
  return routeMatches(pathname, child.href, INDEX_ROUTES.has(child.href));
}

function sectionActive(pathname: string, item: NavItem) {
  if (item.children?.some((child) => childActive(pathname, child))) return true;
  if (item.href === "/workbench") return pathname === "/" || pathname === "/ops" || pathname === "/workbench";
  return routeMatches(pathname, item.href, item.exact);
}

/** 互斥：同 pathname 命中多个父 section 时，取「路径最长」那个作为唯一 active。
 *  ponytail: 用 href 长度排序；children 命中的按 child.href 算（更深 = 更具体）。
 *  单一线性扫描，O(N)；N = nav 项数量，无性能问题。 */
function bestActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: { href: string; rank: number } | null = null;
  for (const item of items) {
    if (!sectionActive(pathname, item)) continue;
    // 优先用最深 child 的 href（代表真正的当前位置）
    const childHit = item.children?.find((c) => childActive(pathname, c));
    const candidate = childHit?.href ?? item.href;
    if (!best || candidate.length > best.rank) best = { href: candidate, rank: candidate.length };
  }
  return best?.href ?? null;
}

function Section({ item, pathname, open, onToggle }: { item: NavItem; pathname: string; open: boolean; onToggle: () => void }) {
  const active = sectionActive(pathname, item);
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);

  return (
    <div>
      <div className={cn(
        "group flex items-center rounded-[13px] transition",
        active ? "bg-white text-[#111116] shadow-[0_8px_24px_rgba(20,18,16,.09)]" : "text-white/62 hover:bg-white/8 hover:text-white"
      )}>
        <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition", active ? "bg-[#151517] text-white" : "bg-white/8 text-white/72 group-hover:bg-white/12")}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold">{item.label}</span>
            <span className={cn("block truncate text-[9px]", active ? "text-[#7d766f]" : "text-white/32")}>{item.description}</span>
          </span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            className={cn("mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px] transition", active ? "text-[#77716b] hover:bg-[#eee9e3]" : "text-white/38 hover:bg-white/10 hover:text-white")}
            aria-expanded={open}
            aria-label={`${open ? "收起" : "展开"}${item.label}`}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}
      </div>

      {hasChildren && (
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden">
            <div className="ml-6 border-l border-white/10 py-1 pl-3">
              {item.children!.map((child) => {
                const ChildIcon = child.icon;
                const selected = childActive(pathname, child);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11px] transition",
                      selected ? "bg-[#c8b8ff] font-semibold text-[#211c31]" : "text-white/43 hover:bg-white/7 hover:text-white/80"
                    )}
                  >
                    <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const allSections = [...NAV_ITEMS, SETTINGS_ITEM];
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(
    allSections.filter((item) => item.children?.length && sectionActive(pathname, item)).map((item) => [item.href, true])
  ));

  useEffect(() => {
    // pathname 变化：互斥 - 取「最具体」那个父 section 强制展开；其它收起。
    // 用户手动展开过的非 active section 仍保持展开（粘性偏好）。
    setExpanded((current) => {
      const best = bestActiveHref(pathname, allSections);
      const next: Record<string, boolean> = {};
      for (const item of allSections) {
        const isActive = item.children?.length && sectionActive(pathname, item);
        const isBest = best != null && item.href !== best && (item.children?.some((c) => c.href === best) || (item.href === best && bestActiveHref(pathname, allSections) === item.href));
        const sticky = current[item.href] === true && !isActive && !isBest;
        next[item.href] = isActive || isBest || sticky;
      }
      return next;
    });
  }, [pathname]);

  const projectActive = pathname === "/project" || pathname.startsWith("/accounts");

  return (
    <>
      <aside className="fixed inset-y-3 left-3 z-40 hidden w-[232px] flex-col overflow-hidden rounded-[22px] bg-[#121214] p-3 text-white shadow-[0_24px_60px_rgba(18,18,20,.18)] lg:flex">
        <Link href="/workbench" className="mb-5 flex items-center gap-3 px-2 pt-2">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#c8b8ff] text-sm font-black text-[#17151a]">KH</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-[-0.02em]">Korea Hospital</span>
            <span className="block text-[9px] tracking-[0.08em] text-white/36">SOCIAL WORKSPACE</span>
          </span>
        </Link>

        <div className="mb-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/28">全部工作模块</div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,.16)_transparent] [scrollbar-width:thin]">
          {NAV_ITEMS.map((item) => (
            <Section
              key={item.href}
              item={item}
              pathname={pathname}
              open={Boolean(expanded[item.href])}
              onToggle={() => setExpanded((current) => ({ ...current, [item.href]: !current[item.href] }))}
            />
          ))}
        </nav>

        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          <Link href="/project" className={cn("flex items-center gap-2.5 rounded-[13px] px-2.5 py-2 transition", projectActive ? "bg-white text-[#111116]" : "text-white/58 hover:bg-white/8 hover:text-white")}>
            <span className={cn("grid h-8 w-8 place-items-center rounded-[10px]", projectActive ? "bg-[#151517] text-white" : "bg-white/8")}><Building2 className="h-4 w-4" /></span>
            <span className="text-[12px] font-semibold">项目与账号</span>
          </Link>
          <Section
            item={SETTINGS_ITEM}
            pathname={pathname}
            open={Boolean(expanded[SETTINGS_ITEM.href])}
            onToggle={() => setExpanded((current) => ({ ...current, [SETTINGS_ITEM.href]: !current[SETTINGS_ITEM.href] }))}
          />
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-[20px] bg-[#121214] px-2 py-2 text-white shadow-[0_18px_50px_rgba(18,18,20,.28)] lg:hidden">
        {NAV_ITEMS.filter((item) => ["/workbench", "/production", "/contents", "/assets", "/data/posts"].includes(item.href)).map((item) => {
          const active = sectionActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex min-w-14 flex-col items-center gap-1 rounded-[13px] px-2 py-1.5 text-[10px]", active ? "bg-white text-[#111116]" : "text-white/55")}>
              <Icon className="h-[17px] w-[17px]" />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
