"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Layers, ArrowLeft, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PLATFORM_NAME } from "@/lib/constants";

interface Brief {
  id: number; title: string; audience: string | null; objective: string | null;
  facts: string | null; evidence: string | null; compliance_notes: string | null;
  variant_count: number;
}
interface Variant {
  id: number; brief_id: number; platform: string | null; account_id: number | null;
  account_name: string | null; format: string | null; content: string | null; workflow_status: string;
}

const emptyBrief = { title: "", audience: "", objective: "", facts: "", evidence: "", compliance_notes: "" };

export default function ProductionPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [bf, setBf] = useState(emptyBrief);
  const [editBriefId, setEditBriefId] = useState<number | null>(null);
  const [vplat, setVplat] = useState("xiaohongshu");
  const [vformat, setVformat] = useState("text");
  const [vcontent, setVcontent] = useState("");
  const [editVariantId, setEditVariantId] = useState<number | null>(null);

  const loadBriefs = () => fetch("/api/briefs").then((r) => r.json()).then(setBriefs).catch(() => {});
  useEffect(() => { loadBriefs(); }, []);

  function selectBrief(id: number) {
    setSelectedId(id);
    setEditBriefId(null);
    setEditVariantId(null);
    fetch("/api/variants?brief_id=" + id).then((r) => r.json()).then(setVariants).catch(() => setVariants([]));
  }

  function addBrief() {
    if (!bf.title.trim()) return toast.error("请填写简报标题");
    fetch("/api/briefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bf) })
      .then((r) => r.json()).then(() => { toast.success("已新建母版简报"); setBf(emptyBrief); loadBriefs(); })
      .catch(() => toast.error("失败"));
  }

  function saveBrief() {
    if (!selectedId) return;
    fetch("/api/briefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedId, ...bf }) })
      .then(() => { toast.success("母版已更新"); setEditBriefId(null); loadBriefs(); })
      .catch(() => {});
  }

  function addVariant() {
    if (!selectedId) return toast.error("先选择简报");
    fetch("/api/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief_id: selectedId, platform: vplat, format: vformat, content: vcontent }) })
      .then(() => { setVcontent(""); toast.success("已派生平台版本"); selectBrief(selectedId); })
      .catch(() => {});
  }

  const STATUS_LABEL: Record<string, string> = {
    draft: "草稿", ai_review: "AI 审核", human_review: "待人工终审",
    approved: "已批准", rejected: "已退回", blocked: "高风险/禁止",
  };

  function review(id: number, result: string, type: "ai" | "human") {
    fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: id, reviewer_type: type, result }) })
      .then(() => { toast.success("审核已记录"); selectBrief(selectedId!); })
      .catch(() => toast.error("审核失败"));
  }

  function produce(id: number) {
    fetch("/api/produce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: id }) })
      .then(() => { toast.success("已生成，进入 AI 审核"); selectBrief(selectedId!); })
      .catch(() => toast.error("生成失败"));
  }

  function saveVariant(id: number, content: string) {
    fetch("/api/variants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content }) })
      .then(() => { toast.success("版本已保存（历史+1）"); setEditVariantId(null); selectBrief(selectedId!); })
      .catch(() => {});
  }

  const sel = briefs.find((b) => b.id === selectedId);

  return (
    <PageFrame>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">单篇生产</h2>
          <p className="text-sm text-stone-500">选题生成母版简报，再派生各平台版本；各版本独立编辑、保留历史，互不覆盖母版事实。</p>
        </div>
        <Link href="/workbench" className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-3.5 w-3.5" /> 回工作区</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h3 className="text-sm font-semibold text-stone-800">母版简报</h3>
            {briefs.length === 0 ? (
              <p className="text-xs text-stone-300">暂无简报</p>
            ) : (
              briefs.map((b) => (
                <button key={b.id} onClick={() => selectBrief(b.id)}
                  className={"w-full rounded-xl border px-3 py-2 text-left transition " + (selectedId === b.id ? "border-indigo-300 bg-indigo-50/50" : "border-stone-200 hover:border-stone-300")}>
                  <p className="text-sm font-medium text-stone-800">{b.title}</p>
                  <p className="text-[11px] text-stone-400">{b.variant_count ?? 0} 个平台版本</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-2 pt-5">
              <h4 className="text-sm font-semibold text-stone-800">新建母版简报</h4>
              <Input value={bf.title} onChange={(e) => setBf({ ...bf, title: e.target.value })} placeholder="简报标题（选题）" />
              <Input value={bf.audience} onChange={(e) => setBf({ ...bf, audience: e.target.value })} placeholder="目标人群" />
              <Input value={bf.objective} onChange={(e) => setBf({ ...bf, objective: e.target.value })} placeholder="内容目标" />
              <Textarea className="min-h-16" value={bf.facts} onChange={(e) => setBf({ ...bf, facts: e.target.value })} placeholder="核心事实" />
              <Textarea className="min-h-12" value={bf.compliance_notes} onChange={(e) => setBf({ ...bf, compliance_notes: e.target.value })} placeholder="合规说明" />
              <Button size="sm" onClick={addBrief}><Plus className="h-4 w-4" /> 新建</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedId && sel && (
        <div className="mt-6 space-y-4">
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">母版内容 · {sel.title}</h3>
                <Button size="sm" variant="outline" onClick={() => (editBriefId === selectedId ? saveBrief() : (setBf({ title: sel.title, audience: sel.audience ?? "", objective: sel.objective ?? "", facts: sel.facts ?? "", evidence: sel.evidence ?? "", compliance_notes: sel.compliance_notes ?? "" }), setEditBriefId(selectedId)))}>{editBriefId === selectedId ? "保存母版" : "编辑母版"}</Button>
              </div>
              {editBriefId === selectedId ? (
                <>
                  <Input value={bf.title} onChange={(e) => setBf({ ...bf, title: e.target.value })} />
                  <Input value={bf.audience} onChange={(e) => setBf({ ...bf, audience: e.target.value })} placeholder="目标人群" />
                  <Textarea className="min-h-20" value={bf.facts} onChange={(e) => setBf({ ...bf, facts: e.target.value })} />
                  <Textarea className="min-h-12" value={bf.compliance_notes} onChange={(e) => setBf({ ...bf, compliance_notes: e.target.value })} />
                </>
              ) : (
                <div className="space-y-1 text-sm text-stone-600">
                  <p><b>人群：</b>{sel.audience || "—"}</p>
                  <p><b>目标：</b>{sel.objective || "—"}</p>
                  <p><b>事实：</b>{sel.facts || "—"}</p>
                  <p><b>合规：</b>{sel.compliance_notes || "—"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">平台版本</h3>
                <Badge className="bg-stone-100 text-stone-500">{variants.length} 个版本</Badge>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <select value={vplat} onChange={(e) => setVplat(e.target.value)} className="rounded-lg glass px-2 py-1.5 text-sm text-stone-600">
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={vformat} onChange={(e) => setVformat(e.target.value)} className="rounded-lg glass px-2 py-1.5 text-sm text-stone-600">
                  <option value="text">图文/文案</option>
                  <option value="video">视频/脚本</option>
                </select>
                <Input className="flex-1 min-w-[200px]" value={vcontent} onChange={(e) => setVcontent(e.target.value)} placeholder="版本内容/文案/脚本" />
                <Button size="sm" onClick={addVariant}><Plus className="h-4 w-4" /> 派生版本</Button>
              </div>
              <div className="space-y-2">
                {variants.length === 0 ? <p className="text-xs text-stone-300">暂无平台版本（可用上方派生小红书/抖音版本）</p> : variants.map((v) => (
                  <div key={v.id} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white text-stone-600">{PLATFORM_NAME[v.platform ?? ""] ?? v.platform ?? "通用"}</Badge>
                        <span className="text-[11px] text-stone-400">{v.format} · {v.account_name ?? "未绑账号"}</span>
                        <Badge className={v.workflow_status === "approved" ? "bg-emerald-50 text-emerald-600" : v.workflow_status === "blocked" ? "bg-rose-50 text-rose-600" : v.workflow_status === "ai_review" ? "bg-indigo-50 text-indigo-600" : "bg-stone-100 text-stone-500"}>{STATUS_LABEL[v.workflow_status] ?? v.workflow_status}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => produce(v.id)}><Sparkles className="h-3.5 w-3.5" /> AI 生成</Button>
                        <Button size="sm" variant="outline" onClick={() => review(v.id, "", "ai")}>AI 审核</Button>
                        <Button size="sm" variant="ghost" onClick={() => review(v.id, "approve", "human")} title="人工批准">通过</Button>
                        <Button size="sm" variant="ghost" onClick={() => review(v.id, "reject", "human")} title="人工退回">退回</Button>
                        <Button size="sm" variant="ghost" onClick={() => (editVariantId === v.id ? saveVariant(v.id, v.content ?? "") : setEditVariantId(v.id))}>
                          {editVariantId === v.id ? <><Save className="h-3.5 w-3.5" /> 保存</> : "编辑"}
                        </Button>
                      </div>
                    </div>
                    {editVariantId === v.id ? (
                      <Textarea className="mt-2 min-h-20" value={v.content ?? ""} onChange={(e) => setVariants((list) => list.map((x) => x.id === v.id ? { ...x, content: e.target.value } : x))} />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{v.content || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}
