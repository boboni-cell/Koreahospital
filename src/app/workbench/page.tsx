"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, RefreshCw, CheckCircle2, ArrowUpRight, Sparkles,
  Users, Layers, KanbanSquare, Radar, Target, PenLine, Palette, Send, BarChart3,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_NAME } from "@/lib/constants";

interface Project { id: number; name: string }
interface Content {
  id: number; title: string; body: string | null; platform: string; role: string | null;
  status: string; scheduled_for: string | null; published_at: string | null; created_at: string;
}
interface Account {
  id: number; platform: string; handle: string; role: string; followers: number;
  status: string; positioning?: string | null; environment_status?: string;
}
interface Pillar { id: number; name: string; description?: string | null }
interface Stat { pendingContents: number; totalAssets: number; totalFollowers: number }
type ColumnId = "draft" | "scheduled" | "published";

const AGENTS = [
  { id: "researcher", name: "研究员", en: "Researcher", desc: "信号、竞品、选题研究", icon: Radar },
  { id: "strategist", name: "策略师", en: "Strategist", desc: "账号定位、内容支柱、母版简报", icon: Target },
  { id: "writer", name: "文案", en: "Writer", desc: "小红书/抖音文案与脚本", icon: PenLine },
  { id: "designer", name: "设计", en: "Designer", desc: "封面、配图、分镜", icon: Palette },
  { id: "publisher", name: "发布", en: "Publisher", desc: "发布包、排期与已发布", icon: Send },
  { id: "analyst", name: "分析师", en: "Analyst", desc: "数据指标、归因、回写", icon: BarChart3 },
];

const COLUMNS: { id: ColumnId; label: string; hint: string; dot: string }[] = [
  { id: "draft", label: "新选题", hint: "草稿", dot: "bg-stone-300" },
  { id: "scheduled", label: "待发布", hint: "已排期", dot: "bg-stone-400" },
  { id: "published", label: "已发布", hint: "进入复盘", dot: "bg-emerald-500" },
];

function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-[11px] font-medium text-stone-600 ring-2 ring-white">
      {name.slice(0, 1)}
    </span>
  );
}

function Pie({ segments, size = 104, center, label }: { segments: { label: string; value: number }[]; size?: number; center?: string | number; label?: string }) {
  const COLORS = ["#6366f1", "#94a3b8", "#d1d5db"];
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s, i) => {
    const start = (acc / total) * 360; acc += s.value; const end = (acc / total) * 360;
    return (COLORS[i % COLORS.length]) + " " + start.toFixed(1) + "deg " + end.toFixed(1) + "deg";
  }).join(", ");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center rounded-full" style={{ width: size, height: size, background: "conic-gradient(" + stops + ")" }}>
        <span className="text-lg font-semibold text-white">{center ?? total}</span>
        {label && <span className="absolute -bottom-4 text-[11px] text-stone-500">{label}</span>}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[11px] text-stone-500">
        {segments.map((s, i) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {s.label} <b className="text-stone-700">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function WorkbenchPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [stats, setStats] = useState<Stat | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/content-pillars").then((r) => r.json()),
      fetch("/api/home/stats").then((r) => r.json()),
    ])
      .then(([pj, ct, ac, pl, st]) => {
        setProject((pj?.current ?? null) as Project | null);
        setContents((ct ?? []) as Content[]);
        setAccounts((ac ?? []) as Account[]);
        setPillars((pl ?? []) as Pillar[]);
        setStats(st as Stat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const grouped = useMemo(() => {
    const map: Record<ColumnId, Content[]> = { draft: [], scheduled: [], published: [] };
    for (const c of contents) {
      if (c.status === "published") map.published.push(c);
      else if (c.scheduled_for) map.scheduled.push(c);
      else map.draft.push(c);
    }
    return map;
  }, [contents]);

  const q = query.trim().toLowerCase();
  const pick = (arr: Content[]) => q ? arr.filter((c) => c.title.toLowerCase().includes(q) || (c.body ?? "").toLowerCase().includes(q)) : arr;
  const filtered = { draft: pick(grouped.draft), scheduled: pick(grouped.scheduled), published: pick(grouped.published) };

  const statusSegments = [
    { label: "新选题", value: grouped.draft.length },
    { label: "待发布", value: grouped.scheduled.length },
    { label: "已发布", value: grouped.published.length },
  ];
  const activeAccounts = accounts.filter((a) => a.status !== "archived").length;
  const accountSegments = [
    { label: "可用", value: activeAccounts },
    { label: "其他", value: Math.max(accounts.length - activeAccounts, 0) },
  ];

  const agentCounts: Record<string, number> = {
    researcher: contents.length + pillars.length,
    strategist: pillars.length,
    writer: grouped.draft.length,
    designer: stats?.totalAssets ?? 0,
    publisher: grouped.scheduled.length + grouped.published.length,
    analyst: grouped.published.length,
  };

  function markPublished(id: number) {
    fetch("/api/contents/" + id + "/publish", { method: "POST" }).then(() => refresh()).catch(() => {});
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge className="bg-stone-100 text-stone-500 font-normal">运营工作区</Badge>
              {project && <span className="text-xs text-stone-400">当前项目 · {project.name}</span>}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">内容从选题到复盘，一站流转</h2>
            <p className="mt-1 text-sm text-stone-500">项目上下文、账号矩阵、内容管线、六角色 Agent 与数据复盘。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input className="w-52 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索内容" />
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className="h-4 w-4" /> 刷新</Button>
            <Link href="/project"><Button size="sm" variant="outline">项目简报</Button></Link>
            <Link href="/contents/new"><Button size="sm"><Plus className="h-4 w-4" /> 新建内容</Button></Link>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-3 overflow-x-auto border-b border-stone-100 pb-4">
          <Users className="h-4 w-4 shrink-0 text-stone-400" />
          {accounts.length === 0 ? <span className="text-xs text-stone-300">暂无账号</span> : accounts.map((a) => (
            <div key={a.id} className="group relative shrink-0">
              <Avatar name={a.handle} />
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-800 px-2 py-1 text-[11px] text-white opacity-0 shadow transition group-hover:opacity-100">
                {PLATFORM_NAME[a.platform] ?? a.platform} · {a.handle}
              </div>
            </div>
          ))}
          <Link href="/accounts" className="ml-auto shrink-0 text-xs text-stone-500 hover:text-stone-700">管理账号 →</Link>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="内容总数" value={contents.length} icon={<Sparkles className="h-4 w-4" />} />
          <Stat label="账号" value={accounts.length} icon={<Users className="h-4 w-4" />} />
          <Stat label="内容支柱" value={pillars.length} icon={<Layers className="h-4 w-4" />} />
          <Stat label="素材" value={stats?.totalAssets ?? 0} icon={<KanbanSquare className="h-4 w-4" />} />
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <Card key={col.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={"h-2 w-2 rounded-full " + col.dot} />
                    <span className="text-sm font-medium text-stone-700">{col.label}</span>
                    <Badge className="bg-stone-100 text-stone-500 font-normal">{filtered[col.id].length}</Badge>
                  </div>
                  <span className="text-[11px] text-stone-400">{col.hint}</span>
                </div>
                <div className="space-y-2.5">
                  {filtered[col.id].length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-200 py-10 text-center text-xs text-stone-300">
                      {loading ? "加载中…" : "暂无内容"}
                    </div>
                  ) : (
                    filtered[col.id].map((c) => (
                      <Link href="/contents" key={c.id}>
                        <div className="group cursor-pointer rounded-lg border border-stone-200 p-3 transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-sm">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] text-stone-400">{PLATFORM_NAME[c.platform] ?? c.platform}</span>
                            <Avatar name={accounts.find((a) => a.platform === c.platform)?.handle ?? "-"} />
                          </div>
                          <p className="line-clamp-2 text-sm text-stone-800">{c.title}</p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
                            <span>{c.scheduled_for ? c.scheduled_for.slice(0, 16).replace("T", " ") : c.created_at.slice(0, 10)}</span>
                            {c.status !== "published" ? (
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); markPublished(c.id); }} className="inline-flex items-center gap-1 text-stone-500 opacity-0 transition group-hover:opacity-100 hover:text-emerald-600" title="标记已发布">
                                <CheckCircle2 className="h-3.5 w-3.5" /> 发布
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> 已发布</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-800">六角色 Agent 协作</h3>
              <p className="text-xs text-stone-400">一个项目上下文上的岗位分工</p>
            </div>
            <Link href="/agent-contracts"><Badge className="bg-indigo-50 text-indigo-600 font-normal transition hover:bg-indigo-100">6 角色合同 →</Badge></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((ag) => {
              const Icon = ag.icon;
              return (
                <div key={ag.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800">{ag.name}<span className="ml-1 text-[11px] text-stone-400">{ag.en}</span></p>
                    <p className="truncate text-[11px] text-stone-400">{ag.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-stone-700">{agentCounts[ag.id] ?? 0}</p>
                    <p className="text-[10px] text-stone-400">队列</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">知识库</h3>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <Link href="/knowledge" className="hover:text-stone-700">知识库</Link>
                  <Link href="/signals" className="hover:text-stone-700">信号池</Link>
                  <Link href="/accounts" className="hover:text-stone-700">账号矩阵 <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
              <div className="space-y-2">
                {pillars.length === 0 ? <p className="text-xs text-stone-300">暂无内容支柱</p> : pillars.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
                    <div>
                      <p className="text-sm text-stone-700">{p.name}</p>
                      <p className="text-[11px] text-stone-400">{p.description ?? "—"}</p>
                    </div>
                    <span className="text-xs text-stone-300">{p.id}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-2 text-sm font-semibold text-stone-800">数据总览</h3>
              <div className="grid grid-cols-2 gap-4">
                <Pie segments={statusSegments} center={contents.length} label="内容状态" />
                <Pie segments={accountSegments} center={accounts.length} label="账号健康" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                <Tile label="待处理" value={stats?.pendingContents ?? 0} />
                <Tile label="粉丝" value={stats?.totalFollowers ?? 0} />
                <Tile label="素材" value={stats?.totalAssets ?? 0} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-stone-100 text-stone-500">{icon}</div>
      <div>
        <p className="text-xl font-semibold text-stone-800">{value}</p>
        <p className="text-xs text-stone-400">{label}</p>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-50 py-2">
      <p className="font-medium text-stone-700">{value}</p>
      <p className="text-stone-400">{label}</p>
    </div>
  );
}
