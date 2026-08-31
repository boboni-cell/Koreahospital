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
          </CardContent>
        </Card>
      ))}
    </PageFrame>
  );
}
