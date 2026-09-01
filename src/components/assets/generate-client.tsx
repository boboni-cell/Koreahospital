"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, ImageIcon, Video, Wand2, Link2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SURGERY_TYPE_OPTIONS } from "@/lib/constants";

type GenKind = "image" | "video";

interface Content {
  id: number;
  title: string;
  body: string;
  role: string;
  platform: string;
}

interface MediaModel {
  kind: GenKind;
  model: string;
  is_mock: number;
}

export function GenerateClient() {
  const sp = useSearchParams();
  const [kind, setKind] = useState<GenKind>("image");
  const [activeModels, setActiveModels] = useState<{ image?: string; video?: string }>({});
  const [prompt, setPrompt] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [surgery, setSurgery] = useState("FUE");
  const [gen, setGen] = useState(false);
  const [result, setResult] = useState<{ url: string; file_type: string } | null>(null);

  // —— 从内容生成配图流程（feature 4）——
  const [contents, setContents] = useState<Content[]>([]);
  const [contentId, setContentId] = useState<string>("");
  const [plan, setPlan] = useState<{ shouldUseReal: boolean; reason: string; prompt: string; category: string } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [genFromContent, setGenFromContent] = useState(false);
  const [syncedId, setSyncedId] = useState<number | null>(null);

  async function reloadModels() {
    const data = await fetch("/api/media-models").then((r) => r.json());
    const list: MediaModel[] = data.models || [];
    setActiveModels({
      image: list.find((m) => m.kind === "image")?.model,
      video: list.find((m) => m.kind === "video")?.model,
    });
  }

  useEffect(() => {
    reloadModels();
    fetch("/api/contents")
      .then((r) => r.json())
      .then((d: Content[]) => setContents(d))
      .catch(() => {});
    // 从选题池【配图】进入：预填提示词为导向
    const tid = sp.get("topic");
    if (tid) {
      fetch("/api/topics")
        .then((r) => r.json())
        .then((list: { id: number; title: string; description: string | null }[]) => {
          const t = list.find((x) => String(x.id) === tid);
          if (t) setPrompt(`围绕「${t.title}」做一张小红书配图。${t.description || ""}`);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!prompt.trim()) return toast.error("请填写生成提示词");
    if (kind === "image" && !activeModels.image)
      return toast.error("请先在「图像/视频」中配置图像模型");
    if (kind === "video" && !activeModels.video)
      return toast.error("请先在「图像/视频」中配置视频模型");
    setGen(true);
    setResult(null);
    try {
      const r = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt:
            kind === "image"
              ? `医疗合规：毛发移植/植发相关，自然真实，禁止夸大疗效。${prompt}`
              : prompt,
          surgery_type: surgery,
          patient_code: patientCode || null,
          filename: `${kind === "video" ? "视频" : "配图"}-${Date.now()}`,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成失败");
      setResult({ url: d.asset.file_url, file_type: d.asset.file_type });
      toast.success("已生成并存入素材库");
    } catch (e: any) {
      toast.error(e.message || "生成失败");
    } finally {
      setGen(false);
    }
  }

  /** agent 判断：这篇内容该用真实照片还是 AI 生图 */
  async function planForContent() {
    const c = contents.find((x) => String(x.id) === contentId);
    if (!c) return toast.error("请先选择一篇内容");
    setPlanning(true);
    setPlan(null);
    setSyncedId(null);
    try {
      const r = await fetch("/api/ai/visual-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c }),
      });
      const d = await r.json();
      setPlan(d);
      if (d.shouldUseReal) {
        toast.info("这篇内容建议用真实拍摄照片（更稳妥）");
      } else if (d.prompt) {
        setPrompt(d.prompt);
        toast.success("已按 skill 生成配图提示词，可直接生成");
      }
    } catch {
      toast.error("分析失败");
    } finally {
      setPlanning(false);
    }
  }

  /** 用 plan 的提示词生成配图，自动按 agent 指定类别入库 */
  async function genFromContentNow() {
    const c = contents.find((x) => String(x.id) === contentId);
    if (!c || !plan) return toast.error("请先分析配图方案");
    if (!activeModels.image) return toast.error("没有启用中的图像模型");
    setGenFromContent(true);
    try {
      const r = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image",
          prompt: `医疗合规：禁止夸大疗效。${plan.prompt || prompt}`,
          category: plan.category || "科普图示",
          surgery_type: null,
          patient_code: null,
          filename: `${c.title.slice(0, 20)}-配图-${Date.now()}`,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成失败");
      setResult({ url: d.asset.file_url, file_type: d.asset.file_type });
      setSyncedId(d.asset.id);
      toast.success(`已生成并自动进入素材库「${d.asset.category}」`);
    } catch (e: any) {
      toast.error(e.message || "生成失败");
    } finally {
      setGenFromContent(false);
    }
  }

  /** 确认可发布 → 同步为这篇内容的封面（配文案） */
  async function syncToContent() {
    const c = contents.find((x) => String(x.id) === contentId);
    if (!c || !result) return toast.error("请先选择内容并生成配图");
    const r = await fetch(`/api/contents/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_url: result.url }),
    });
    if (r.ok) {
      toast.success(`已把配图设为「${c.title}」的封面（内容管理中可查看）`);
    } else toast.error("同步失败");
  }

  return (
    <div className="space-y-5">
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-zinc-900">AI 生成配图 / 视频</h2>
      <p className="mb-4 text-sm text-zinc-500">
        图像模型：{activeModels.image ? `✓ ${activeModels.image}` : "未启用"} ｜
        视频模型：{activeModels.video ? `✓ ${activeModels.video}` : "未启用"}
      </p>

      {/* 从内容生成配图 */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> 从内容生成配图
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>选择内容（来自内容管理）</Label>
            <Select value={contentId} onValueChange={(v) => setContentId(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contents.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={planForContent} disabled={planning || !contentId}>
              {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              分析配图方案（该用实拍还是 AI）
            </Button>
            {plan && !plan.shouldUseReal && (
              <Button onClick={genFromContentNow} disabled={genFromContent || !activeModels.image}>
                {genFromContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                按 Skill 提示词生成
              </Button>
            )}
            {result && syncedId && (
              <Button variant="outline" onClick={syncToContent}>
                <Link2 className="h-4 w-4" /> 设为该内容封面
              </Button>
            )}
          </div>

          {plan && (
            <div className="rounded-xl bg-[#f6f4f5] p-3 text-sm">
              <div className="flex items-center gap-2">
                {plan.shouldUseReal ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Camera className="h-4 w-4" /> 建议用真实拍摄照片
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-500">
                    <ImageIcon className="h-4 w-4" /> 建议用 AI 生成
                  </span>
                )}
                <span className="pill bg-[#ecedf2] text-[#717a94]">建议类别：{plan.category}</span>
              </div>
              <p className="mt-2 text-xs text-[#717a94]">{plan.reason}</p>
              {plan.prompt && (
                <p className="mt-2 rounded-lg bg-white p-2 text-xs text-[#43394c]">{plan.prompt}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动生成 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> 手动生成设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>当前{kind === "image" ? "图像" : "视频"}模型</Label>
              <div className="flex items-center justify-between rounded-xl border border-[#e4e0e6] bg-white px-3 py-2 text-sm">
                <span>{activeModels[kind] || "未配置"}</span>
                <a href="/settings/media-models" className="text-xs text-rose-500 hover:underline">
                  配置图像/视频模型 →
                </a>
              </div>
            </div>
            <div className="space-y-1">
              <Label>类型</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as GenKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image"><span className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> 图像配图</span></SelectItem>
                  <SelectItem value="video"><span className="flex items-center gap-1"><Video className="h-4 w-4" /> 短视频</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>提示词（{kind === "image" ? "画面描述" : "镜头/动态描述"}）</Label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#e4e0e6] bg-white px-3 py-2 text-sm focus:outline-none"
                placeholder={kind === "image" ? "如：韩国医院无菌层流手术室俯拍，暖光，真实医疗场景" : "如：发际线种植术后 180 天恢复过程快剪，自然光"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>手术类型</Label>
                <Select value={surgery} onValueChange={(v) => setSurgery(v ?? "FUE")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SURGERY_TYPE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>患者编号（可选）</Label>
                <Input value={patientCode} onChange={(e) => setPatientCode(e.target.value)} placeholder="P-2026-001" />
              </div>
            </div>
            <Button onClick={run} disabled={gen} className="w-full">
              {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {gen ? "生成中…" : `生成${kind === "image" ? "配图" : "视频"}`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>预览</CardTitle></CardHeader>
          <CardContent>
            {gen || genFromContent ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-[#f6f4f5] text-sm text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 模型生成中…
              </div>
            ) : result ? (
              result.file_type === "video" ? (
                <video src={result.url} controls className="h-64 w-full rounded-xl object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.url} alt="生成结果" className="h-64 w-full rounded-xl object-contain" />
              )
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl bg-[#f6f4f5] text-sm text-zinc-400">
                生成后在此预览，并自动进入素材库
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
