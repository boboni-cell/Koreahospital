"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCsv } from "@/lib/csv";

interface Summary {
  posts: number;
  reliable_posts: number;
  total_views: number;
  engagement_rate: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
}
interface Row {
  id: number;
  title: string | null;
  platform: string;
  handle: string | null;
  published_at: string | null;
  views: number;
  engagement_rate: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
  low_sample: boolean;
}
interface Draft {
  id: number;
  diagnosis: string;
  evidence: string;
  actions_json: string;
  model_powered: number;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
}
interface Account {
  id: number;
  platform: string;
  handle: string;
}

export default function ReportsPage() {
  const [scope, setScope] = useState("project_month");
  const [accountId, setAccountId] = useState("all");
  const [data, setData] = useState<{
    summary: Summary;
    rows: Row[];
    drafts: Draft[];
    accounts: Account[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillContentId, setBackfillContentId] = useState<string>("");
  const [backfillMetrics, setBackfillMetrics] = useState({ views: "", likes: "", saves: "", comments: "", shares: "" });
  const [backfillSaving, setBackfillSaving] = useState(false);
  const [feishuSyncing, setFeishuSyncing] = useState<number | null>(null);
  const [contents, setContents] = useState<{ id: number; title: string }[]>([]);

  async function loadContents() {
    try {
      const d = await fetch("/api/contents").then((r) => r.json());
      setContents((d || []).map((c: any) => ({ id: c.id, title: c.title })));
    } catch {}
  }
  useEffect(() => { loadContents(); }, []);
  async function load() {
    const query = new URLSearchParams({ scope });
    if (accountId !== "all") query.set("account_id", accountId);
    return fetch("/api/data/reports?" + query)
      .then((response) => response.json())
      .then(setData);
  }
  useEffect(() => {
    load();
  }, [scope, accountId]);

  async function submitBackfill() {
    if (!backfillContentId) return toast.error("请选择一篇内容");
    setBackfillSaving(true);
    try {
      const r = await fetch("/api/post-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: Number(backfillContentId),
          views: Number(backfillMetrics.views || 0),
          likes: Number(backfillMetrics.likes || 0),
          saves: Number(backfillMetrics.saves || 0),
          comments: Number(backfillMetrics.comments || 0),
          shares: Number(backfillMetrics.shares || 0),
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("已回填数据。回填后请用 Cmd/Ctrl+Z 撤销错误的输入");
      setBackfillOpen(false);
      setBackfillMetrics({ views: "", likes: "", saves: "", comments: "", shares: "" });
      load();
    } catch {
      toast.error("回填失败");
    } finally {
      setBackfillSaving(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      const response = await fetch("/api/data/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          account_id: accountId === "all" ? null : Number(accountId),
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("归因草稿已生成");
      await load();
    } catch {
      toast.error("生成失败");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(id: number) {
    const response = await fetch("/api/data/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", id }),
    });
    const result = await response.json();
    if (response.ok) {
      toast.success(`已确认并生成 ${result.tasks} 个运营任务`);
      load();
    }
  }
  async function syncFeishu(id: number) {
    setFeishuSyncing(id);
    try {
      const r = await fetch("/api/data/reports/feishu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "同步飞书失败");
      toast.success("复盘报告已同步到飞书");
      if (d.docUrl) window.open(d.docUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message || "同步飞书失败");
    } finally {
      setFeishuSyncing(null);
    }
  }
  function exportCsv() {
    const headers = [
      "发布时间",
      "平台",
      "账号",
      "标题",
      "有效浏览",
      "互动率",
      "分享率",
      "涨粉转化率",
      "低样本",
    ];
    const rows = (data?.rows ?? []).map((row) => [
      row.published_at ?? "",
      row.platform,
      row.handle ?? "",
      row.title ?? "",
      row.views,
      row.engagement_rate ?? "",
      row.share_rate ?? "",
      row.follower_conversion_rate ?? "",
      row.low_sample ? "是" : "否",
    ]);
    const csv = toCsv(headers, rows);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `复盘报告-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  const summary = data?.summary;

  return (
    <PageFrame>
      <section className="mb-5 rounded-[24px] border border-[#ded7cf] bg-[#f0c7cc] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/today"
              className="inline-flex items-center gap-1 text-xs text-[#776b67] hover:text-[#211e1c]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> 返回今日待发
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#776b67]">
                Data center · Review
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
                复盘报告
              </h2>
              <p className="mt-1 text-sm text-[#6e625e]">
                确定性指标打底，AI只生成归因草稿；人工确认后才转成行动任务。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBackfillOpen(true)}>
              <Pencil className="h-4 w-4" /> 回填数据
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> 导出 CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => data?.drafts[0] && syncFeishu(data.drafts[0].id)}
              disabled={!data?.drafts.length || feishuSyncing !== null}
              title={data?.drafts.length ? "同步最新一份复盘报告" : "请先生成归因草稿"}
            >
              {feishuSyncing !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {data?.drafts.length ? "同步最新报告到飞书" : "同步飞书（先生成报告）"}
            </Button>
            <Button onClick={generate} disabled={busy}>
              <Sparkles className="h-4 w-4" />{" "}
              {busy ? "生成中…" : "生成归因草稿"}
            </Button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Segment
            active={scope === "single"}
            onClick={() => setScope("single")}
          >
            单篇复盘
          </Segment>
          <Segment
            active={scope === "account_week"}
            onClick={() => setScope("account_week")}
          >
            账号周报
          </Segment>
          <Segment
            active={scope === "project_month"}
            onClick={() => setScope("project_month")}
          >
            项目月报
          </Segment>
          <Select
            value={accountId}
            onValueChange={(value) => setAccountId(value ?? "all")}
          >
            <SelectTrigger className="ml-auto w-56 border-black/8 bg-white/55">
              <SelectValue>
                {accountId === "all"
                  ? "全部账号"
                  : data?.accounts.find(
                      (account) => String(account.id) === accountId,
                    )?.handle}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账号</SelectItem>
              {(data?.accounts ?? []).map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.handle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={FileText}
          label="帖子数"
          value={`${summary?.posts ?? 0}`}
          note={`${summary?.reliable_posts ?? 0} 篇可靠样本`}
          tone="bg-[#f4dba9]"
        />
        <Stat
          icon={TrendingUp}
          label="互动率中位数"
          value={rate(summary?.engagement_rate)}
          note="统一7天窗口"
          tone="bg-[#cbd8f1]"
        />
        <Stat
          icon={Target}
          label="分享率中位数"
          value={rate(summary?.share_rate)}
          note="分享 ÷ 有效浏览"
          tone="bg-[#bfe9da]"
        />
        <Stat
          icon={ClipboardCheck}
          label="涨粉转化率"
          value={rate(summary?.follower_conversion_rate)}
          note="缺失时不估算"
          tone="bg-[#d8cdf5]"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="border-[#e2dcd5] bg-[#fffefa]">
          <CardContent className="p-5">
            <h3 className="font-semibold text-[#2d2926]">本期帖子证据</h3>
            <p className="text-xs text-[#918981]">
              中国市场时间 · 低样本仅展示
            </p>
            <div className="mt-3 space-y-2">
              {(data?.rows ?? []).slice(0, 10).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[13px] border border-[#e8e1da] bg-[#f8f4ef] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#3a3531]">
                      {row.title ?? "未命名帖子"}
                    </p>
                    {row.low_sample && (
                      <Badge className="bg-[#fae7bf] text-[#8a6321]">
                        低样本
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-[#817a73]">
                    <span>浏览 {row.views}</span>
                    <span>互动 {rate(row.engagement_rate)}</span>
                    <span>分享 {rate(row.share_rate)}</span>
                    <span>涨粉 {rate(row.follower_conversion_rate)}</span>
                  </div>
                </div>
              ))}
              {!data?.rows.length && (
                <p className="py-8 text-center text-xs text-[#918981]">
                  当前范围没有帖子数据。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {(data?.drafts ?? []).map((draft) => {
            let actions: string[] = [];
            try {
              actions = JSON.parse(draft.actions_json || "[]");
            } catch {}
            return (
              <Card key={draft.id} className="border-[#e2dcd5] bg-[#fffefa]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          draft.model_powered
                            ? "bg-[#eee8ff] text-[#665a86]"
                            : "bg-[#e7eee9] text-[#536b5a]"
                        }
                      >
                        {draft.model_powered ? "AI草稿" : "规则草稿"}
                      </Badge>
                      <span className="text-[11px] text-[#918981]">
                        {draft.period_start} — {draft.period_end}
                      </span>
                    </div>
                    <Badge
                      className={
                        draft.status === "confirmed"
                          ? "bg-[#dff4e8] text-[#35684d]"
                          : "bg-[#fae7bf] text-[#8a6321]"
                      }
                    >
                      {draft.status === "confirmed" ? "已确认" : "待确认"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[#302b28]">
                    归因草稿
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#5f5751]">
                    {draft.diagnosis}
                  </p>
                  <p className="mt-2 rounded-[12px] bg-[#f4efe9] p-3 text-xs text-[#756e67]">
                    证据：{draft.evidence}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {actions.map((action, index) => (
                      <div
                        key={index}
                        className="flex gap-2 text-xs text-[#514b46]"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eee8ff] text-[10px] font-semibold text-[#665a86]">
                          {index + 1}
                        </span>
                        {action}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {draft.status === "draft" && <Button onClick={() => confirm(draft.id)}><CheckCircle2 className="h-4 w-4" /> 人工确认并生成任务</Button>}
                    <Button variant="outline" onClick={() => syncFeishu(draft.id)} disabled={feishuSyncing !== null}>
                      {feishuSyncing === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} 同步到飞书
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!data?.drafts.length && (
            <div className="rounded-[20px] border border-dashed border-[#d8d0c8] p-10 text-center text-sm text-[#918981]">
              还没有复盘草稿。点击顶部“生成归因草稿”，生成后即可同步到飞书。
            </div>
          )}
        </div>
      </div>

      {/* 回填对话框 */}
      {backfillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#211e1c]">回填帖子数据</h3>
              <button onClick={() => setBackfillOpen(false)} aria-label="关闭" className="rounded p-1 hover:bg-[#f4eeea]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-[#776b67]">
              从平台后台复制最新数字填入。如填错可立刻 Cmd/Ctrl+Z 撤销（前端尚未提交则直接清空输入；已提交可去今日待发再覆盖一次）。
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-[#675f58]">选择内容</label>
                <select
                  value={backfillContentId}
                  onChange={(e) => setBackfillContentId(e.target.value)}
                  className="w-full rounded-lg border border-[#e4ddd5] bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">— 选择一篇已发布内容 —</option>
                  {contents.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["views", "likes", "saves", "comments", "shares"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <label className="text-xs text-[#675f58]">
                      {k === "views" ? "浏览" : k === "likes" ? "点赞" : k === "saves" ? "收藏" : k === "comments" ? "评论" : "分享"}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={backfillMetrics[k]}
                      onChange={(e) => setBackfillMetrics((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full rounded-lg border border-[#e4ddd5] bg-white px-3 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBackfillOpen(false)}>取消</Button>
              <Button onClick={submitBackfill} disabled={backfillSaving}>
                {backfillSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                回填
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

function rate(value?: number | null) {
  return value == null ? "未提供" : `${value.toFixed(2)}%`;
}
function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold ${active ? "bg-[#171619] text-white" : "bg-white/55 text-[#675f58]"}`}
    >
      {children}
    </button>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <Card className={`${tone} border-transparent`}>
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-[#4d4640]" />
        <p className="mt-4 text-[11px] text-[#675f58]">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#28231f]">
          {value}
        </p>
        <p className="mt-1 text-[10px] text-[#746c65]">{note}</p>
      </CardContent>
    </Card>
  );
}
