"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TodayList from "@/components/ops/today-list";
import { AiWorkshop } from "@/components/contents/ai-workshop";

const TABS = [
  { id: "today", label: "今日待发" },
  { id: "schedule", label: "内容排期" },
  { id: "manage", label: "内容管理" },
  { id: "new", label: "新建内容" },
  { id: "ai", label: "AI 文案工坊" },
  { id: "research", label: "选题研究" },
];

interface ProjectOption { id: number; name: string }

export default function OpsHub() {
  const [tab, setTab] = useState("today");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [current, setCurrent] = useState<ProjectOption | null>(null);
  const [overview, setOverview] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setCurrent(d.current ?? null);
      })
      .catch(() => {});
    fetch("/api/overview").then((r) => r.json()).then(setOverview).catch(() => {});
  }, []);

  function switchProject(id: string) {
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: Number(id) }),
    })
      .then((r) => r.json())
      .then((d) => setCurrent(d.current ?? null))
      .catch(() => {});
  }

  return (
    <PageFrame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">运营中心</h2>
        <div className="flex items-center gap-2">
          <Link href="/workbench">
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-[#473982] transition hover:bg-indigo-100">
              运营工作区
            </span>
          </Link>
          <span className="text-xs text-[#89828d]">所有运营动作都在这里完成</span>
          {current && (
            <span className="text-xs text-[#717a94]">
              当前项目 · <span className="font-medium text-[#31263b]">{current.name}</span>
            </span>
          )}
          {projects.length > 1 && (
            <select
              value={current?.id ?? ""}
              onChange={(e) => switchProject(e.target.value)}
              className="rounded-lg border border-[#e4e0e6] bg-white px-2 py-1 text-xs text-[#43394c]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { key: "pendingContents", label: "待处理内容", href: "/contents", tone: "text-[#43394c]" },
          { key: "pendingReview", label: "待人工审核", href: "/production", tone: "text-[#473982]" },
          { key: "pendingPublish", label: "待发布包", href: "/production", tone: "text-[#473982]" },
          { key: "pendingBackfill", label: "待回填", href: "/review", tone: "text-[#473982]" },
          { key: "riskFlags", label: "风险异常", href: "/signals", tone: "text-[#b04848]" },
          { key: "pendingWriteback", label: "待确认回写", href: "/review", tone: "text-[#473982]" },
        ].map((c) => (
          <Link key={c.key} href={c.href} className="surface px-3 py-2.5 transition hover:-translate-y-0.5">
            <div className="text-[11px] text-[#89828d]">{c.label}</div>
            <div className={"mt-1 text-2xl font-semibold " + c.tone}>{overview ? (overview[c.key] ?? 0) : "…"}</div>
          </Link>
        ))}
      </div>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="today">
          <TodayList />
        </TabsContent>
        <TabsContent value="schedule">
          <iframe src="/calendar?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="内容排期" />
        </TabsContent>
        <TabsContent value="manage">
          <iframe src="/contents?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="内容管理" />
        </TabsContent>
        <TabsContent value="new">
          <iframe src="/contents/new?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="新建内容" />
        </TabsContent>
        <TabsContent value="ai">
          <AiWorkshop />
        </TabsContent>
        <TabsContent value="research">
          <iframe src="/contents/research?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="选题研究" />
        </TabsContent>
      </Tabs.Root>
    </PageFrame>
  );
}
