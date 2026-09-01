"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Image as ImageIcon,
  Lightbulb,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Project { id: number; name: string }
interface Content {
  id: number;
  title: string;
  body: string | null;
  platform: string;
  role: string | null;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
}
interface Account {
  id: number;
  platform: string;
  handle: string;
  role: string;
  followers: number;
  status: string;
}
interface Pillar { id: number; name: string; description?: string | null }
interface Stat { pendingContents: number; totalAssets: number; totalFollowers: number }
type ColumnId = "draft" | "scheduled" | "published";

const COLUMNS: Array<{ id: ColumnId; label: string; hint: string; tone: string; dot: string }> = [
  { id: "draft", label: "待制作", hint: "从选题开始", tone: "bg-[#f8d7da] border-[#efc2c7]", dot: "bg-[#d96d7b]" },
  { id: "scheduled", label: "待发布", hint: "已完成排期", tone: "bg-[#f7e4c5] border-[#efd5ab]", dot: "bg-[#d3993d]" },
  { id: "published", label: "待复盘", hint: "已发布内容", tone: "bg-[#d4eee3] border-[#bee3d4]", dot: "bg-[#4ba47f]" },
];

const AGENTS = [
  { name: "研究", icon: Radar, tone: "bg-[#d7e2f7] text-[#4e68a6]" },
  { name: "策略", icon: Target, tone: "bg-[#f3dfb9] text-[#9a6b27]" },
  { name: "文案", icon: ClipboardList, tone: "bg-[#f4cbd0] text-[#a45360]" },
  { name: "设计", icon: ImageIcon, tone: "bg-[#ddd5f6] text-[#7160b0]" },
  { name: "发布", icon: Send, tone: "bg-[#cce9dd] text-[#3d876b]" },
  { name: "分析", icon: BarChart3, tone: "bg-[#d7e2f7] text-[#4e68a6]" },
];

function initials(value: string) {
  return value.trim().slice(0, 1) || "·";
}

export default function WorkbenchPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [stats, setStats] = useState<Stat | null>(null);
  const [overview, setOverview] = useState<Record<string, number>>({});
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
      fetch("/api/overview").then((r) => r.json()),
    ])
      .then(([pj, ct, ac, pl, st, ov]) => {
        setProject((pj?.current ?? null) as Project | null);
        setContents((ct ?? []) as Content[]);
        setAccounts((ac ?? []) as Account[]);
        setPillars((pl ?? []) as Pillar[]);
        setStats(st as Stat);
        setOverview((ov ?? {}) as Record<string, number>);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const grouped = useMemo(() => {
    const map: Record<ColumnId, Content[]> = { draft: [], scheduled: [], published: [] };
    for (const content of contents) {
      if (content.status === "published") map.published.push(content);
      else if (content.scheduled_for) map.scheduled.push(content);
      else map.draft.push(content);
    }
    return map;
  }, [contents]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pick = (list: Content[]) => needle
      ? list.filter((item) => item.title.toLowerCase().includes(needle) || (item.body ?? "").toLowerCase().includes(needle))
      : list;
    return { draft: pick(grouped.draft), scheduled: pick(grouped.scheduled), published: pick(grouped.published) };
  }, [grouped, query]);

  const workflow = [
    { step: "01", title: "发现信号", desc: "收集并人工确认", href: "/signals", count: overview.riskFlags ?? 0, icon: Radar, tone: "tone-blue" },
    { step: "02", title: "确定策略", desc: "简报、账号与支柱", href: "/project", count: pillars.length, icon: Target, tone: "tone-yellow" },
    { step: "03", title: "生产审核", desc: "文案、素材与合规", href: "/production", count: grouped.draft.length, icon: Sparkles, tone: "tone-pink" },
    { step: "04", title: "排期发布", desc: "生成发布包并排期", href: "/calendar", count: grouped.scheduled.length, icon: CalendarDays, tone: "tone-lilac" },
    { step: "05", title: "数据中心", desc: "帖子、账号、复盘与信息源", href: "/data/posts", count: (overview.pendingBackfill ?? 0) + (overview.pendingWriteback ?? 0), icon: BarChart3, tone: "tone-mint" },
  ];

  const todo = [
    { label: "待人工审核", value: overview.pendingReview ?? 0, href: "/production", tone: "bg-[#f8d7da]" },
    { label: "待生成发布包", value: overview.pendingPublish ?? 0, href: "/production", tone: "bg-[#f7e4c5]" },
    { label: "待回填数据", value: overview.pendingBackfill ?? 0, href: "/data/posts/import", tone: "bg-[#d7e2f7]" },
    { label: "待确认回写", value: overview.pendingWriteback ?? 0, href: "/data/reports", tone: "bg-[#d4eee3]" },
  ];

  function markPublished(id: number) {
    fetch(`/api/contents/${id}/publish`, { method: "POST" }).then(refresh).catch(() => {});
  }

  return (
    <PageFrame>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border border-[#ded8d1] bg-white text-[#6d6761]">今日运营</Badge>
              <span className="text-xs text-[#938c85]">当前项目 · {project?.name ?? "加载中"}</span>
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#171619] sm:text-4xl">从信号到复盘，按流程完成今天的内容</h2>
            <p className="mt-2 text-sm text-[#77716b]">先看待办，再沿着 5 个步骤推进。每项能力都在它应该出现的位置。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> 刷新数据</Button>
            <Link href="/contents/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#151517] px-5 text-sm font-semibold text-white transition hover:bg-[#2a282c]"><Plus className="h-4 w-4" /> 新建内容</Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="待处理内容" value={overview.pendingContents ?? contents.length} note="进入生产队列" icon={FileCheck2} tone="tone-pink" />
          <Metric label="待人工审核" value={overview.pendingReview ?? 0} note="需要你确认" icon={CheckCircle2} tone="tone-yellow" />
          <Metric label="账号矩阵" value={accounts.length} note={`${accounts.filter((a) => a.status !== "archived").length} 个可用`} icon={Users} tone="tone-lilac" />
          <Metric label="可用素材" value={stats?.totalAssets ?? 0} note="图片与视频" icon={ImageIcon} tone="tone-mint" />
        </section>

        <section className="surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#171619]">标准运营流程</h3>
              <p className="mt-0.5 text-xs text-[#8a837c]">不知道下一步做什么时，从左到右推进</p>
            </div>
            <Link href="/project" className="text-xs font-semibold text-[#6559a7] hover:underline">查看项目简报</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={item.step} href={item.href} className={cn("group relative min-h-[142px] rounded-[17px] border p-4 transition hover:-translate-y-0.5", item.tone)}>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold tracking-[0.14em] text-[#514b46]/55">STEP {item.step}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/75 text-[#2b2825]"><Icon className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[#201e1b]">{item.title}</div>
                      <div className="mt-1 text-[11px] text-[#625c56]">{item.desc}</div>
                    </div>
                    <span className="text-2xl font-semibold tracking-[-0.04em] text-[#201e1b]">{item.count}</span>
                  </div>
                  {index < workflow.length - 1 && <ArrowRight className="absolute -right-[17px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[#a39b92] md:block" />}
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="surface min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#171619]">内容进度板</h3>
                <p className="mt-0.5 text-xs text-[#8a837c]">按真实状态自动归类，点击卡片进入内容管理</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b948d]" />
                  <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索内容" />
                </div>
                <Link href="/contents" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dfdad4] bg-white text-[#57524d] transition hover:border-[#b8b0a8]" aria-label="打开内容管理"><ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {COLUMNS.map((column) => (
                <div key={column.id} className="rounded-[18px] border border-[#e5dfd8] bg-[#f8f6f2] p-3">
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={cn("h-2.5 w-2.5 rounded-full", column.dot)} />
                    <span className="text-sm font-semibold text-[#2a2724]">{column.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#6d6761]">{filtered[column.id].length}</span>
                    <span className="ml-auto text-[10px] text-[#9a938b]">{column.hint}</span>
                  </div>
                  <div className="space-y-2.5">
                    {filtered[column.id].length === 0 ? (
                      <div className="grid min-h-32 place-items-center rounded-[14px] border border-dashed border-[#d9d2ca] bg-white/55 text-xs text-[#a39c94]">{loading ? "加载中…" : "暂无内容"}</div>
                    ) : filtered[column.id].slice(0, 5).map((content) => (
                      <Link href="/contents" key={content.id} className={cn("group block rounded-[15px] border p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm", column.tone)}>
                        <div className="mb-5 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-white/75 px-2 py-1 text-[10px] font-semibold text-[#5e5852]">{PLATFORM_NAME[content.platform] ?? content.platform}</span>
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[11px] font-bold text-[#5e5852]">{initials(accounts.find((a) => a.platform === content.platform)?.handle ?? content.role ?? "-")}</span>
                        </div>
                        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#25221f]">{content.title}</p>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-[#6f6861]">
                          <span>{content.scheduled_for ? content.scheduled_for.slice(0, 16).replace("T", " ") : content.created_at.slice(0, 10)}</span>
                          {content.status !== "published" ? (
                            <button onClick={(event) => { event.preventDefault(); event.stopPropagation(); markPublished(content.id); }} className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 font-semibold opacity-0 transition group-hover:opacity-100" title="标记已发布"><Check className="h-3 w-3" /> 发布</button>
                          ) : <span className="inline-flex items-center gap-1 font-semibold"><Check className="h-3 w-3" /> 已发布</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#171619]">下一步待办</h3>
                  <p className="text-[11px] text-[#918a83]">优先处理需要人工确认的事项</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eee9e3] text-[#5f5953]"><ClipboardList className="h-4 w-4" /></span>
              </div>
              <div className="space-y-2">
                {todo.map((item) => (
                  <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-[14px] border border-[#e6e0d9] bg-white p-2.5 transition hover:border-[#cfc7be]">
                    <span className={cn("grid h-9 w-9 place-items-center rounded-[11px] text-sm font-bold text-[#282522]", item.tone)}>{item.value}</span>
                    <span className="text-xs font-medium text-[#514c47]">{item.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-[#aaa29a]" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#171619]">账号与协作</h3>
                  <p className="text-[11px] text-[#918a83]">{accounts.length} 个账号 · 6 个岗位 Agent</p>
                </div>
                <div className="flex -space-x-2">
                  {accounts.slice(0, 4).map((account) => <span key={account.id} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#d9d2f5] text-[10px] font-bold text-[#554a82]">{initials(account.handle)}</span>)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {AGENTS.map((agent) => {
                  const Icon = agent.icon;
                  return <Link href="/agent-contracts" key={agent.name} className="flex flex-col items-center gap-1.5 rounded-[13px] bg-[#f8f6f2] px-2 py-3 text-[10px] font-medium text-[#615b55]"><span className={cn("grid h-8 w-8 place-items-center rounded-[10px]", agent.tone)}><Icon className="h-4 w-4" /></span>{agent.name}</Link>;
                })}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <QuickLink href="/signals" label="信号池" icon={Radar} />
              <QuickLink href="/knowledge" label="知识库" icon={Lightbulb} />
              <QuickLink href="/accounts" label="账号矩阵" icon={Users} />
              <QuickLink href="/project" label="项目简报" icon={Target} />
            </section>
          </aside>
        </div>
      </div>
    </PageFrame>
  );
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className={cn("rounded-[18px] border p-4 sm:p-5", tone)}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/75 text-[#302c28]"><Icon className="h-[18px] w-[18px]" /></span>
        <span className="text-3xl font-semibold tracking-[-0.05em] text-[#211f1c]">{value}</span>
      </div>
      <div className="mt-5 text-sm font-semibold text-[#2d2925]">{label}</div>
      <div className="mt-0.5 text-[11px] text-[#6e6760]">{note}</div>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="surface flex items-center gap-2 p-3 text-xs font-semibold text-[#514c47]">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white"><Icon className="h-4 w-4" /></span>
      {label}
    </Link>
  );
}
