"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SURGERY_TYPE_OPTIONS, PLATFORMS, NORWOOD_OPTIONS } from "@/lib/constants";

interface Variant {
  role: string;
  title: string;
  body: string;
  tags: string[];
  score?: { total: number; scores: Record<string, number>; tips: string[] };
}

const ROLE_LABELS: Record<string, string> = {
  director: "院长版",
  consultant: "顾问版",
  official: "官方版",
  case_study: "案例版",
  knowledge: "科普版",
  viral: "引流版",
};

const ALL_ROLES = ["director", "consultant", "official", "case_study", "knowledge", "viral"];

export function AiWorkshop() {
  const searchParams = useSearchParams();
  const [patientId, setPatientId] = useState("");
  const [surgery, setSurgery] = useState("FUE");
  const [surgeryCustom, setSurgeryCustom] = useState("");
  const [norwood, setNorwood] = useState("III");
  const [norwoodCustom, setNorwoodCustom] = useState("");
  const [days, setDays] = useState("180");
  const [highlight, setHighlight] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(ALL_ROLES);
  const [customRoles, setCustomRoles] = useState<Record<string, string>>({});
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleBrief, setNewRoleBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [modelPowered, setModelPowered] = useState(true);
  const [mediaPlan, setMediaPlan] = useState<{ mediaType: string; shouldUseReal: boolean; desc: string; storyboard: { no: number; duration: string; shot: string; scene: string; voiceover: string }[] | null } | null>(null);

  // 从选题池带入：把选题标题/描述预填为关键亮点
  useEffect(() => {
    const tid = searchParams.get("topic");
    if (!tid) return;
    fetch(`/api/topics`)
      .then((r) => r.json())
      .then((list: { id: number; title: string; description: string | null }[]) => {
        const t = list.find((x) => String(x.id) === tid);
        if (t) setHighlight(`${t.title}｜${t.description ?? ""}`.replace(/｜$/u, ""));
      })
      .catch(() => {});
  }, [searchParams]);

  function addCustomRole() {
    const name = newRoleName.trim();
    if (!name) return toast.error("请填角色名");
    const key = "custom:" + name;
    if (customRoles[key]) return toast.error("角色已存在");
    setCustomRoles((p) => ({ ...p, [key]: newRoleBrief.trim() || `${name}角色` }));
    setSelectedRoles((p) => (p.includes(key) ? p : [...p, key]));
    setNewRoleName("");
    setNewRoleBrief("");
    toast.success(`已添加自定义角色「${name}」`);
  }

  async function generate() {
    if (!selectedRoles.length) return toast.error("请至少选择一个账号角色");
    setLoading(true);
    setVariants([]);
    try {
      const r = await fetch("/api/ai/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          surgery: surgery === "__custom__" ? surgeryCustom : surgery,
          norwood: norwood === "__custom__" ? norwoodCustom : norwood,
          days,
          highlight,
          platform,
          roles: selectedRoles,
          customRoles,
        }),
      });
      const d = await r.json();
      setModelPowered(d.modelPowered !== false);
      setVariants(d.variants ?? []);
      if (d.modelPowered === false) toast.warning("模型未配置，使用模板文案");
      // 同步获取「该内容适合配什么图/视频」
      try {
        const mp = await fetch("/api/ai/media-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { title: highlight || `${surgery ?? ""}植发`, body: highlight, platform, role: selectedRoles[0] ?? "" } }),
        });
        if (mp.ok) setMediaPlan(await mp.json());
      } catch { /* 静默 */ }
    } catch (e) {
      toast.error("生成失败");
    } finally {
      setLoading(false);
    }
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t);
    toast.success("已复制");
  }

  function saveDraft(v: Variant) {
    fetch("/api/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: v.title,
        body: v.body,
        platform,
        role: v.role,
        status: "draft",
      }),
    })
      .then(() => toast.success("已保存到草稿箱，去「今日发布」可复制发布"))
      .catch(() => toast.error("保存失败"));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-rose-400" />
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">AI 文案工坊</h2>
        {!modelPowered && <span className="pill bg-[#ecedf2] text-[#717a94]">模板模式</span>}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          <div className="space-y-1 md:col-span-3 rounded-md border border-border bg-[#faf8f4] px-3 py-2 text-xs text-[#5f5953]">
            文案模型在「<a href="/settings/agent-models" className="underline">系统设置 → Agent 模型</a>」中按 Agent 单独配置（writer 控制文案）。
          </div>
          <div className="space-y-1">
            <Label>患者编号</Label>
            <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="P-2026-001" />
          </div>
          <div className="space-y-1">
            <Label>手术方式</Label>
            <Select value={surgery} onValueChange={(v) => setSurgery(v ?? "FUE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SURGERY_TYPE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                <SelectItem value="__custom__">自定义…</SelectItem>
              </SelectContent>
            </Select>
            {surgery === "__custom__" && (
              <Input className="mt-1" value={surgeryCustom} onChange={(e) => setSurgeryCustom(e.target.value)} placeholder="填写手术方式" />
            )}
          </div>
          <div className="space-y-1">
            <Label>脱发等级 (Norwood)</Label>
            <Select value={norwood} onValueChange={(v) => setNorwood(v ?? "III")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NORWOOD_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
                <SelectItem value="__custom__">自定义…</SelectItem>
              </SelectContent>
            </Select>
            {norwood === "__custom__" && (
              <Input className="mt-1" value={norwoodCustom} onChange={(e) => setNorwoodCustom(e.target.value)} placeholder="填写脱发等级" />
            )}
          </div>
          <div className="space-y-1">
            <Label>恢复天数</Label>
            <Input value={days} onChange={(e) => setDays(e.target.value)} placeholder="180" />
          </div>
          <div className="space-y-1">
            <Label>目标平台</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>关键亮点</Label>
            <Input value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="发际线自然、密度均匀" />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#89828d]">生成角色：</span>
              {ALL_ROLES.map((r) => {
                const on = selectedRoles.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setSelectedRoles((prev) =>
                        on ? prev.filter((x) => x !== r) : [...prev, r]
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-xs transition ${
                      on
                        ? "bg-rose-400 text-white"
                        : "bg-[#ecedf2] text-[#717a94] hover:bg-[#ecedf2]"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setSelectedRoles(selectedRoles.length === ALL_ROLES.length ? [] : ALL_ROLES)
                }
                className="rounded-full px-2.5 py-1 text-xs text-[#89828d] hover:text-[#43394c]"
              >
                {selectedRoles.length === ALL_ROLES.length ? "清空" : "全选"}
              </button>
            </div>
            {/* 自定义角色 */}
            <div className="flex items-center gap-1.5">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="自定义角色名"
                className="h-8 w-28 rounded-full border border-[#e4e0e6] px-3 text-xs focus:outline-none"
              />
              <input
                value={newRoleBrief}
                onChange={(e) => setNewRoleBrief(e.target.value)}
                placeholder="人设brief(可选)"
                className="h-8 w-40 rounded-full border border-[#e4e0e6] px-3 text-xs focus:outline-none"
              />
              <button
                onClick={addCustomRole}
                className="rounded-full bg-[#01011b] px-3 py-1 text-xs text-white hover:bg-stone-700"
              >
                添加角色
              </button>
            </div>
            <Button onClick={generate} disabled={loading} className="ml-auto">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "生成中…" : `生成 ${selectedRoles.length || 0} 篇文案`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <>
          {mediaPlan && (
            <Card className="mb-4 border-rose-200 bg-rose-50/40">
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center gap-2">
                  <span className={`pill ${mediaPlan.mediaType === "video" ? "bg-violet-100 text-violet-600" : "bg-rose-100 text-rose-600"}`}>
                    {mediaPlan.mediaType === "video" ? "🎬 建议视频" : "🖼 建议配图"}
                  </span>
                  <span className={`pill ${mediaPlan.shouldUseReal ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"}`}>
                    {mediaPlan.shouldUseReal ? "推荐：真实拍摄" : "推荐：AI 生成"}
                  </span>
                </div>
                <p className="text-sm text-[#31263b]">{mediaPlan.desc}</p>
                {mediaPlan.storyboard && mediaPlan.storyboard.length > 0 && (
                  <div className="space-y-1">
                    {mediaPlan.storyboard.map((s) => (
                      <div key={s.no} className="rounded-lg bg-white p-2 text-xs text-[#43394c]">
                        <span className="font-medium text-[#01011b]">镜头{s.no}（{s.duration}）</span> · {s.shot}
                        <div className="text-[#717a94]">{s.scene}{s.voiceover ? `｜旁白：${s.voiceover}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-[#89828d]">如需拍摄脚本，去「选题池 → 生成视频脚本」可产出分镜直接拍摄。</p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
          {variants.map((v, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{ROLE_LABELS[v.role] ?? v.role}</span>
                  {v.score && (
                    <span className="pill bg-rose-400 text-white">总分 {v.score.total}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-[#01011b]">{v.title}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#43394c]">{v.body}</p>
                </div>
                {v.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.tags.map((t, j) => (
                      <span key={j} className="pill bg-[#ecedf2] text-[#717a94]">#{t}</span>
                    ))}
                  </div>
                )}
                {v.score?.scores && (
                  <div className="flex flex-wrap gap-2 text-xs text-[#89828d]">
                    {Object.entries(v.score.scores).map(([k, val]) => (
                      <span key={k}>{k} {val}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => copyText(`${v.title}\n\n${v.body}`)}>
                    <Copy className="h-3.5 w-3.5" /> 复制
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => saveDraft(v)}>
                    保存草稿
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
