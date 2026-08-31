"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Publish {
  id: number; variant_id: number; platform: string | null; account_name: string | null;
  content_version: number; published_at: string; windows: Snapshot[];
}
interface Snapshot {
  id: number; publish_id: number; window: string; platform_metrics: string; business_metrics: string;
  insufficient_data: number; observed_at: string;
}
const WINDOWS = ["24h", "7d", "30d"];
const PLATFORM_FIELDS = ["views", "likes", "comments", "shares", "saves", "clicks", "inquiries", "leads"];
const BUSINESS_FIELDS = ["leads", "bookings", "deals"];

function parseMetrics(s: string | null): Record<string, number> {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export default function ReviewPage() {
  const [publishes, setPublishes] = useState<Publish[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [insufficient, setInsufficient] = useState<Record<string, number>>({});
  const [analyses, setAnalyses] = useState<Record<number, any[]>>({});

  const load = () => fetch("/api/metric-snapshots").then((r) => r.json()).then((d) => {
    setPublishes(d ?? []);
    const d2: Record<string, Record<string, number>> = {};
    const ins: Record<string, number> = {};
    for (const p of d ?? []) {
      for (const w of p.windows ?? []) {
        const k = p.id + ":" + w.window;
        d2[k] = { ...parseMetrics(w.platform_metrics), ...parseMetrics(w.business_metrics) };
        ins[k] = w.insufficient_data;
      }
    }
    setDrafts(d2); setInsufficient(ins);
  }).catch(() => {});
  useEffect(() => { load(); }, []);

  function set(k: string, field: string, v: string) {
    setDrafts((s) => ({ ...s, [k]: { ...(s[k] ?? {}), [field]: Number(v) || 0 } }));
  }

  function generateAnalysis(publishId: number) {
    fetch("/api/analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publish_id: publishId }) })
      .then((r) => r.json()).then((d) => { toast.success("归因分析已生成"); setAnalyses((s) => ({ ...s, [publishId]: d.analyses ?? [] })); })
      .catch(() => toast.error("分析失败"));
  }

  function decide(proposalId: number, action: string) {
    fetch("/api/writeback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal_id: proposalId, action }) })
      .then((r) => r.json()).then(() => { toast.success(action === "confirm" ? "已确认并写回知识库" : "已拒绝，不改知识库"); load(); })
      .catch(() => toast.error("操作失败"));
  }

  function loadAnalyses(publishId: number) {
    fetch("/api/analyses?publish_id=" + publishId).then((r) => r.json()).then((d) => setAnalyses((s) => ({ ...s, [publishId]: d ?? [] }))).catch(() => {});
  }

  function save(publishId: number, window: string) {
    const k = publishId + ":" + window;
    const platform_metrics: Record<string, number> = {};
    const business_metrics: Record<string, number> = {};
    for (const f of PLATFORM_FIELDS) if (drafts[k]?.[f]) platform_metrics[f] = drafts[k][f];
    for (const f of BUSINESS_FIELDS) if (drafts[k]?.[f]) business_metrics[f] = drafts[k][f];
    fetch("/api/metric-snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publish_id: publishId, window, platform_metrics, business_metrics, insufficient_data: insufficient[k] ? 1 : 0 }) })
      .then(() => { toast.success(window + " 窗口已保存"); load(); })
      .catch(() => toast.error("保存失败"));
  }

  return (
    <PageFrame>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">数据复盘</h2>
          <p className="text-sm text-[#717a94]">同一发布记录保存 24h / 7d / 30d 三窗口；数据不足可显式标记。</p>
        </div>
        <Link href="/workbench" className="inline-flex items-center gap-1 text-xs font-medium text-[#43394c] hover:text-[#01011b]"><ArrowLeft className="h-3.5 w-3.5" /> 回工作区</Link>
      </div>

      {publishes.length === 0 ? <p className="text-sm text-[#89828d]">暂无发布快照（先在单篇生产生成发布包）</p> : publishes.map((p) => (
        <Card key={p.id} className="mb-5">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#473982]" />
                <span className="text-sm font-semibold text-[#01011b]">发布 #{p.id}</span>
                <Badge className="bg-[#473982]/10 text-[#473982]">{p.platform ?? "—"}</Badge>
                <span className="text-xs text-[#89828d]">账号 {p.account_name ?? "—"} · v{p.content_version} · {p.published_at.slice(0, 10)}</span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {WINDOWS.map((w) => {
                const k = p.id + ":" + w;
                return (
                  <div key={w} className="rounded-[6px] border border-[#e4e0e6] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#01011b]">{w === "24h" ? "24 小时" : w === "7d" ? "7 天" : "30 天"}</span>
                      <label className="inline-flex items-center gap-1 text-[11px] text-[#717a94]">
                        <input type="checkbox" checked={!!insufficient[k]} onChange={(e) => setInsufficient((s) => ({ ...s, [k]: e.target.checked ? 1 : 0 }))} /> 数据不足
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PLATFORM_FIELDS.map((f) => (
                        <input key={f} type="number" min={0} value={drafts[k]?.[f] ?? 0} onChange={(e) => set(k, f, e.target.value)} placeholder={f} className="rounded-[4px] border border-[#dbd7da] bg-white px-2 py-1 text-xs text-[#01011b] outline-none focus:border-[#473982] placeholder:text-[#c5c1c9]" />
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {BUSINESS_FIELDS.map((f) => (
                        <input key={f} type="number" min={0} value={drafts[k]?.[f] ?? 0} onChange={(e) => set(k, f, e.target.value)} placeholder={f} className="rounded-[4px] border border-[#dbd7da] bg-white px-2 py-1 text-xs text-[#01011b] outline-none focus:border-[#473982] placeholder:text-[#c5c1c9]" />
                      ))}
                    </div>
                    <Button size="sm" className="mt-3 w-full" onClick={() => save(p.id, w)}><Save className="h-3.5 w-3.5" /> 保存窗口</Button>
                  </div>
                );
              })}
            </div>
            <div className="mb-4 flex items-center gap-2">
              <Button size="sm" onClick={() => { generateAnalysis(p.id); }}>生成归因分析</Button>
              <span className="text-[11px] text-[#89828d]">Analyst 出诊断/证据/回写建议；确认后才写回知识库</span>
            </div>
            {(analyses[p.id] ?? []).length > 0 && (
              <div className="mb-4 space-y-3">
                {analyses[p.id]?.map((a) => (
                  <div key={a.id} className="rounded-[6px] border border-[#e4e0e6] p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#01011b]">归因</span>
                      <Badge className={a.insufficient_data ? "bg-amber-50 text-amber-700" : "bg-[#473982]/10 text-[#473982]"}>{a.insufficient_data ? "数据不足" : "置信度 " + (a.confidence ?? "高")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#43394c]">{a.diagnosis}</p>
                    <p className="text-[11px] text-[#89828d]">证据：{a.evidence}</p>
                    {(a.proposals ?? []).map((pr: any) => (
                      <div key={pr.id} className="mt-2 flex items-start justify-between gap-2 rounded-[4px] bg-[#ecedf2]/50 px-2 py-1.5">
                        <div>
                          <p className="text-xs text-[#01011b]">{pr.change}</p>
                          <p className="text-[10px] text-[#89828d]">{pr.target_library} · {pr.reason} · {pr.status}</p>
                        </div>
                        {pr.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[11px]" onClick={() => decide(pr.id, "confirm")}>确认</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => decide(pr.id, "reject")}>拒绝</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </PageFrame>
  );
}
