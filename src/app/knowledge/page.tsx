"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Archive, Search } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PLATFORM_NAME } from "@/lib/constants";

interface Item {
  id: number; kind: string; platform: string | null; title: string;
  content: string | null; evidence: string | null; status: string; created_at: string;
}

const KINDS = [
  { id: "competitor", label: "竞品档案" },
  { id: "structure", label: "爆款结构库" },
  { id: "cta", label: "CTA 库" },
  { id: "comment", label: "评论引导库" },
];

export default function KnowledgePage() {
  const [kind, setKind] = useState("structure");
  const [items, setItems] = useState<Item[]>([]);
  const [platform, setPlatform] = useState("xiaohongshu");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [evidence, setEvidence] = useState("");
  const [query, setQuery] = useState("");

  const load = () => {
    fetch("/api/knowledge?kind=" + kind).then((r) => r.json()).then(setItems).catch(() => {});
  };
  useEffect(() => { load(); }, [kind]);

  function add() {
    if (!title.trim()) return toast.error("请填写标题");
    fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, platform, title, content, evidence }),
    }).then(() => { setTitle(""); setContent(""); setEvidence(""); toast.success("已新增（人工创建记录）"); load(); })
      .catch(() => toast.error("新增失败"));
  }

  function setStatus(id: number, status: string) {
    fetch("/api/knowledge", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
      .then(() => { toast.success("已更新"); load(); }).catch(() => {});
  }
  function del(id: number) {
    fetch("/api/knowledge?id=" + id, { method: "DELETE" }).then(() => { toast.success("已删除"); load(); }).catch(() => {});
  }

  const list = items.filter((i) => !query || i.title.toLowerCase().includes(query.toLowerCase()) || (i.content ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <PageFrame>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">竞品与内容知识库</h2>
          <p className="text-sm text-[#717a94]">每个知识条目须有来源或人工创建记录；AI 不能直接写入。</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89828d]" />
          <Input className="w-48 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索知识" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className={"rounded-full px-3.5 py-1.5 text-xs font-medium transition " + (kind === k.id ? "bg-[#31263b] text-white" : "bg-[#ecedf2] text-[#717a94] hover:bg-[#ecedf2]")}>
            {k.label}
          </button>
        ))}
      </div>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <SelectWrap value={platform} onChange={setPlatform} />
          <Input className="flex-1 min-w-[180px]" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" />
          <Input className="w-40" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="来源/证据" />
          <Button onClick={add}><Plus className="h-4 w-4" /> 新增条目</Button>
        </CardContent>
        <CardContent className="pb-4">
          <Textarea className="min-h-16" value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容 / 结构 / 话术" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list.length === 0 ? <p className="py-8 text-center text-xs text-[#a9a4ad]">暂无条目</p> : list.map((it) => (
          <div key={it.id} className="flex items-start gap-3 rounded-xl border border-[#e4e0e6] bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link href={`/knowledge/${it.id}`} className="block">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#01011b] hover:underline">{it.title}</span>
                  <Badge className={it.status === "archived" ? "bg-[#ecedf2] text-[#717a94]" : "bg-emerald-50 text-emerald-600"}>{it.status === "archived" ? "已归档" : "启用"}</Badge>
                  <span className="text-[11px] text-[#89828d]">{PLATFORM_NAME[it.platform ?? ""] ?? it.platform ?? "-"}</span>
                </div>
                {it.content && <p className="mt-1 text-sm text-[#43394c]">{it.content}</p>}
                {it.evidence && <p className="mt-0.5 text-[11px] text-[#89828d]">来源：{it.evidence}</p>}
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setStatus(it.id, it.status === "active" ? "archived" : "active")} title={it.status === "active" ? "归档" : "启用"}><Archive className="h-4 w-4 text-[#89828d]" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(it.id)} title="删除"><Trash2 className="h-4 w-4 text-[#89828d]" /></Button>
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

function SelectWrap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-[#e4e0e6] bg-white px-2 py-1.5 text-sm text-[#43394c]">
      {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}
