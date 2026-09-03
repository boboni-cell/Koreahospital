"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ChevronRight, FolderKanban, LayoutPanelTop, Plus } from "lucide-react";
import { ROUTE_TITLES } from "@/lib/nav";

function currentTitle(pathname: string) {
  return ROUTE_TITLES[pathname]
    ?? Object.entries(ROUTE_TITLES)
      .filter(([route]) => route !== "/" && pathname.startsWith(route + "/"))
      .sort(([a], [b]) => b.length - a.length)[0]?.[1]
    ?? "运营工作台";
}

function currentArea(pathname: string) {
  if (pathname.startsWith("/assets") || pathname === "/topics") return "素材运营";
  if (pathname.startsWith("/data") || pathname === "/review") return "数据增长";
  if (pathname.startsWith("/hospital") || pathname.startsWith("/sop")) return "医院协作";
  if (pathname.startsWith("/settings") || pathname.startsWith("/accounts") || pathname === "/project") return "系统管理";
  if (pathname.startsWith("/contents") || pathname === "/production" || pathname === "/signals" || pathname === "/knowledge") return "内容运营";
  return "运营总览";
}

export function Header() {
  const pathname = usePathname();
  const title = currentTitle(pathname);
  const area = currentArea(pathname);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [projectName, setProjectName] = useState("Koreahospital");

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => { setProjectName(data.current?.name ?? "Koreahospital"); setProjects(data.projects ?? []); })
      .catch(() => {});
  }, []);

  async function switchProject(id: string) {
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: Number(id) }) });
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-30 px-4 py-3 lg:ml-[256px] lg:px-8">
      <div className="mx-auto flex min-h-[64px] max-w-[1476px] items-center gap-3 rounded-[18px] border border-[#e2dcd5] bg-[#fffefa] px-3.5 shadow-[0_1px_0_rgba(255,255,255,.9)_inset,0_10px_30px_rgba(38,33,29,.055)] sm:px-4">
        <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#d9d2f5] text-[#514884] sm:grid">
          <LayoutPanelTop className="h-[18px] w-[18px]" />
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9b948d]">
            <span>{area}</span><ChevronRight className="h-3 w-3" /><span className="truncate">{projectName}</span>
          </div>
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em] text-[#171619]">{title}</h1>
        </div>

        <div className="ml-auto hidden items-center gap-2 rounded-[12px] border border-[#e5dfd8] bg-[#f8f6f2] px-3 py-2 md:flex">
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white text-[#6b625c]"><FolderKanban className="h-3.5 w-3.5" /></span>
          <span>
            <span className="block text-[9px] font-medium text-[#99918a]">当前项目</span>
            <select className="block max-w-32 truncate bg-transparent text-[11px] font-semibold text-[#49443f] outline-none" value={projects.find((p) => p.name === projectName)?.id ?? ""} onChange={(e) => switchProject(e.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/calendar" className="hidden h-10 items-center gap-2 rounded-full border border-[#dfdad4] bg-white px-3.5 text-xs font-semibold text-[#57524d] transition hover:border-[#b8b0a8] xl:inline-flex">
            <CalendarClock className="h-4 w-4" /> 查看排期
          </Link>
          <Link href="/contents/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#151517] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2a282c]">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">新建内容</span><span className="sm:hidden">新建</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
