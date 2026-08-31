"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Users,
  Layers,
  KanbanSquare,
  RefreshCw,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_NAME } from "@/lib/constants";

interface Project {
  id: number;
  name: string;
}

interface Content {
  id: number;
  title: string;
  body: string | null;
  platform: string;
  role: string | null;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  project_id: number;
  created_at: string;
}

interface Account {
  id: number;
  platform: string;
  handle: string;
  role: string;
  followers: number;
  status: string;
  positioning?: string | null;
  environment_status?: string;
}

interface Pillar {
  id: number;
  name: string;
  description?: string | null;
}

interface Stat {
  pendingContents: number;
  totalAssets: number;
  totalFollowers: number;
}

type ColumnId = "draft" | "scheduled" | "published";

const PLATFORM_COLOR: Record<string, string> = {
  xiaohongshu: "#f43f5e",
  douyin: "#111827",
  tiktok: "#0ea5e9",
  instagram: "#e11d48",
  youtube: "#dc2626",
  weibo: "#f59e0b",
  wechat: "#22c55e",
  shipinhao: "#10b981",
  naver: "#3b82f6",
};

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function Pie({
  segments,
  size = 110,
  center,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  center?: string | number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${s.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    })
    .join(", ");
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid place-items-center rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
      >
        <span className="text-xl font-bold text-white drop-shadow">{center ?? total}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}

const COLUMNS: { id: ColumnId; title: string; hint: string; color: string }[] = [
  { id: "draft", title: "新选题", hint: "草稿 · 待完善", color: "#6366f1" },
  { id: "scheduled", title: "待发布", hint: "已排期", color: "#0ea5e9" },
  { id: "published", title: "已发布", hint: "进入复盘", color: "#22c55e" },
];

export default function WorkbenchPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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
        setProjects((pj?.projects ?? []) as Project[]);
        setProject((pj?.current ?? null) as Project | null);
        setContents((ct ?? []) as Content[]);
        setAccounts((ac ?? []) as Account[]);
        setPillars((pl ?? []) as Pillar[]);
        setStats(st as Stat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<ColumnId, Content[]> = { draft: [], scheduled: [], published: [] };
    for (const c of contents) {
      if (c.status === "published") map.published.push(c);
      else if (c.scheduled_for) map.scheduled.push(c);
      else map.draft.push(c);
    }
    return map;
  }, [contents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped;
    const pick = (arr: Content[]) => arr.filter((c) => c.title.toLowerCase().includes(q) || (c.body ?? "").toLowerCase().includes(q));
    return { draft: pick(grouped.draft), scheduled: pick(grouped.scheduled), published: pick(grouped.published) };
  }, [grouped, query]);

  const statusSegments = [
    { label: "新选题", value: grouped.draft.length, color: COLUMNS[0].color },
    { label: "待发布", value: grouped.scheduled.length, color: COLUMNS[1].color },
    { label: "已发布", value: grouped.published.length, color: COLUMNS[2].color },
  ];
  const activeAccounts = accounts.filter((a) => a.status !== "archived").length;
  const accountSegments = [
    { label: "可用", value: activeAccounts, color: "#3b82f6" },
    { label: "其他", value: Math.max(accounts.length - activeAccounts, 0), color: "#d4d4d4" },
  ];

  function markPublished(id: number) {
    fetch(`/api/contents/${id}/publish`, { method: "POST" })
      .then(() => {
        refresh();
      })
      .catch(() => {});
  }

  return (
    <PageFrame>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">运营工作区</h2>
          <p className="mt-1 text-sm text-stone-500">
            {project ? `当前项目：${project.name}` : "加载项目…"} · 内容从选题到发布复盘统一流转
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="w-52 pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索内容"
            />
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
          <Link href="/contents/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> 新建内容
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="内容总数" value={contents.length} icon={<Sparkles className="h-4 w-4" />} tone="indigo" />
        <StatCard label="账号" value={accounts.length} icon={<Users className="h-4 w-4" />} tone="sky" />
        <StatCard label="内容支柱" value={pillars.length} icon={<Layers className="h-4 w-4" />} tone="emerald" />
        <StatCard label="素材" value={stats?.totalAssets ?? 0} icon={<KanbanSquare className="h-4 w-4" />} tone="amber" />
      </div>

      {/* 流程看板 */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold text-stone-700">{col.title}</span>
                <Badge className="ml-1 bg-white text-xs text-stone-500">{filtered[col.id].length}</Badge>
              </div>
              <span className="text-[11px] text-stone-400">{col.hint}</span>
            </div>
            <div className="space-y-2.5">
              {filtered[col.id].length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-white/60 py-8 text-center text-xs text-stone-300">
                  {loading ? "加载中…" : "暂无内容"}
                </div>
              ) : (
                filtered[col.id].map((c) => {
                  const acc = accounts.find((a) => a.platform === c.platform);
                  return (
                    <div
                      key={c.id}
                      className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <Badge
                          className="text-[11px]"
                          style={{ backgroundColor: PLATFORM_COLOR[c.platform] ?? "#6b7280", color: "#fff" }}
                        >
                          {PLATFORM_NAME[c.platform] ?? c.platform}
                        </Badge>
                        {acc && <Avatar name={acc.handle} color={PLATFORM_COLOR[c.platform] ?? "#6b7280"} />}
                      </div>
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-stone-800">{c.title}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
                        <span>{c.scheduled_for ? c.scheduled_for.slice(0, 16).replace("T", " ") : c.created_at.slice(0, 10)}</span>
                        {c.status !== "published" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markPublished(c.id);
                            }}
                            className="inline-flex items-center gap-1 text-emerald-600 opacity-0 transition hover:text-emerald-700 group-hover:opacity-100"
                            title="标记已发布"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> 发布
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 已发布
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 底部：知识库 + 数据 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">内容支柱 / 知识库</h3>
              <Link href="/accounts" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
                账号矩阵 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {pillars.length === 0 ? (
                <p className="text-xs text-stone-300">暂无内容支柱</p>
              ) : (
                pillars.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/50 px-3 py-2">
                    <div>
                      <p className="text-sm text-stone-700">{p.name}</p>
                      <p className="text-[11px] text-stone-400">{p.description ?? "—"}</p>
                    </div>
                    <span className="text-xs text-stone-300">{p.id}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-semibold text-stone-800">数据总览</h3>
            <div className="grid grid-cols-2 gap-4">
              <Pie segments={statusSegments} center={contents.length} />
              <Pie segments={accountSegments} center={accounts.length} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-stone-50 py-2">
                <p className="font-semibold text-stone-700">{stats?.pendingContents ?? 0}</p>
                <p className="text-stone-400">待处理</p>
              </div>
              <div className="rounded-lg bg-stone-50 py-2">
                <p className="font-semibold text-stone-700">{stats?.totalFollowers ?? 0}</p>
                <p className="text-stone-400">粉丝</p>
              </div>
              <div className="rounded-lg bg-stone-50 py-2">
                <p className="font-semibold text-stone-700">{stats?.totalAssets ?? 0}</p>
                <p className="text-stone-400">素材</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "indigo" | "sky" | "emerald" | "amber";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-3">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-xl font-semibold leading-none text-stone-800">{value}</p>
        <p className="mt-1 text-xs text-stone-400">{label}</p>
      </div>
    </div>
  );
}
