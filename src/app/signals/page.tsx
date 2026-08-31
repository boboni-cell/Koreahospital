"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X, Upload, Trash2, Search } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PLATFORMS, PLATFORM_NAME } from "@/lib/constants";

interface Signal {
  id: number; platform: string | null; source_url: string | null; title: string;
  evidence: string | null; status: string; confirmed_by: number | null;
  captured_at: string; created_at: string;
}

const STATUS_NAME: Record<string, { label: string; cls: string }> = {
  pending: { label: "待确认", cls: "bg-amber-50 text-amber-600" },
  confirmed: { label: "已确认", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "已驳回", cls: "bg-stone-100 text-stone-500" },
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [evidence, setEvidence] = useState("");
  const [captureUrl, setCaptureUrl] = useState("");
  const [capturing, setCapturing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch("/api/signals").then((r) => r.json()).then(setSignals).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  function add() {
    if (!title.trim()) return toast.error("请填写标题");
    fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, title, source_url: sourceUrl, evidence }),
    }).then(() => { setTitle(""); setSourceUrl(""); setEvidence(""); toast.success("已新增信号"); load(); })
      .catch(() => toast.error("新增失败"));
  }

  function capture() {
    if (!captureUrl.trim()) return toast.error("请填写公开 URL");
    setCapturing(true);
    fetch("/api/signals/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: captureUrl, platform }),
    }).then((r) => r.json())
      .then(() => { toast.success("已采集并进入待确认"); setCaptureUrl(""); load(); })
      .catch(() => toast.error("采集失败"))
      .finally(() => setCapturing(false));
  }

  function setStatus(id: number, status: string) {
    fetch("/api/signals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
      .then(() => { toast.success("已更新状态"); load(); })
      .catch(() => toast.error("更新失败"));
  }

  function del(id: number) {
    fetch("/api/signals?id=" + id, { method: "DELETE" }).then(() => { toast.success("已删除"); load(); }).catch(() => {});
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let count = 0;
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim());
        const p = cols[0] || "xiaohongshu";
        const t = cols[1] || "";
        const url = cols[2] || null;
        const ev = cols[3] || null;
        if (!t) continue;
        fetch("/api/signals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: p, title: t, source_url: url, evidence: ev }) });
        count++;
      }
      toast.success("已导入 " + count + " 条信号");
      setTimeout(load, 500);
    };
    reader.readAsText(file);
  }

  const list = signals.filter((s) => (filter === "all" ? true : s.status === filter))
    .filter((s) => !query || s.title.toLowerCase().includes(query.toLowerCase()) || (s.source_url ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <PageFrame>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">平台信号池 <span className="text-xs font-normal text-stone-400">（未经人工确认不能进入选题池）</span></h2>
          <p className="text-sm text-stone-500">人工填写、收藏 URL、CSV 导入；AI 只读采集结果进入待确认。</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input className="w-48 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索信号" />
        </div>
      </div>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="flex-1 min-w-[140px]" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="来源 URL（可选）" />
          <Input className="flex-1 min-w-[160px]" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="信号标题" />
          <Input className="w-40" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="证据摘要" />
          <Button onClick={add}><Plus className="h-4 w-4" /> 新增信号</Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="flex-1 min-w-[260px]" value={captureUrl} onChange={(e) => setCaptureUrl(e.target.value)} placeholder="公开页面 URL（人工触发只读采集）" />
          <Button onClick={capture} disabled={capturing}>{capturing ? "采集中…" : "采集当前公开页"}</Button>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        {["all", "pending", "confirmed", "rejected"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={"rounded-full px-3 py-1 text-xs transition " + (filter === f ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200")}>
            {f === "all" ? "全部 " + signals.length : (STATUS_NAME[f]?.label ?? f) + " " + signals.filter((s) => s.status === f).length}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> CSV 导入</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
      </div>

      <div className="space-y-2">
        {list.length === 0 ? <p className="text-center text-xs text-stone-300 py-8">暂无信号</p> : list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-800">{s.title}</span>
                <Badge className={STATUS_NAME[s.status]?.cls ?? "bg-stone-100"}>{STATUS_NAME[s.status]?.label ?? s.status}</Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-400">
                <span>{PLATFORM_NAME[s.platform ?? ""] ?? s.platform ?? "-"}</span>
                {s.source_url && <a className="text-sky-600 hover:underline" href={s.source_url} target="_blank" rel="noreferrer">{s.source_url}</a>}
                <span>{s.evidence}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {s.status !== "confirmed" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "confirmed")} title="确认"><Check className="h-4 w-4 text-emerald-600" /></Button>}
              {s.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "rejected")} title="驳回"><X className="h-4 w-4 text-rose-500" /></Button>}
              <Button size="sm" variant="ghost" onClick={() => del(s.id)} title="删除"><Trash2 className="h-4 w-4 text-stone-400" /></Button>
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
