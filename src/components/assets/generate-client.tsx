"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, ImageIcon, Video, Wand2, Link2, Camera, Copy, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaptainPlanDialog } from "@/components/captain-plan-dialog";
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

interface MediaRequestItem {
  id: number;
  kind: GenKind;
  source_label: string | null;
  prompt: string;
  params: Record<string, string>;
  rounds: { round: number; phase: string; note?: string; at: string }[];
  status: string;
  asset_ids: number[];
  created_at: string;
}

export function GenerateClient() {
  const sp = useSearchParams();
  const [kind, setKind] = useState<GenKind>("image");
  const [activeModels, setActiveModels] = useState<{ image?: string; video?: string }>({});
  const [prompt, setPrompt] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [surgery, setSurgery] = useState("FUE");
  const [ratio, setRatio] = useState("3:4");
  const [style, setStyle] = useState("真实医疗纪实");
  const [scene, setScene] = useState("");
  const [usage, setUsage] = useState("小红书正文配图");
  const [duration, setDuration] = useState("15");
  const [resolution, setResolution] = useState("1080p");
  const [storyboard, setStoryboard] = useState("");
  const [bgm, setBgm] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [gen, setGen] = useState(false);
  // captain 分发：手动生成也走总控
  const [captainOpen, setCaptainOpen] = useState(false);
  const [captainTask, setCaptainTask] = useState("");
  const [result, setResult] = useState<{ url: string; file_type: string } | null>(null);
  const [segments, setSegments] = useState<{ label: string; prompt: string; url: string | null }[]>([]);
  const [mediaRequests, setMediaRequests] = useState<MediaRequestItem[]>([]);
  const [requestId, setRequestId] = useState<number | null>(null);

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

  async function refreshMediaRequests() {
    try {
      const d = await fetch("/api/media-requests").then((r) => r.json());
      setMediaRequests(d.requests || []);
    } catch { /* 静默 */ }
  }

  async function trackRequest(kind: GenKind, prompt: string, params: Record<string, string>, phase: string, note: string, status?: string) {
    const body: Record<string, unknown> = { kind, prompt, params };
    if (requestId) body.id = requestId;
    if (status) body.status = status;
    body.round = { phase, note };
    const r = await fetch("/api/media-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.request?.id) setRequestId(d.request.id);
    await refreshMediaRequests();
    return d.request as { id: number } | null | undefined;
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t).then(() => toast.success("已复制"));
  }

  function exportPrompt(t: string, name: string) {
    const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出提示词");
  }

  function composeRequestPrompt(m: MediaRequestItem) {
    const extras = Object.entries(m.params || {}).filter(([, v]) => v).map(([k, v]) => `${k}：${v}`).join("\n");
    return [m.prompt, extras].filter(Boolean).join("\n");
  }

  function mediaStatusLabel(status: string) {
    const map: Record<string, string> = { draft: "待确认", confirmed: "已确认", generating: "生成中", done: "已完成", failed: "失败" };
    return map[status] || status;
  }

  useEffect(() => {
    reloadModels();
    refreshMediaRequests();
    fetch("/api/contents")
      .then((r) => r.json())
      .then((d: Content[]) => setContents(d))
      .catch(() => {});
    // 从选题池【配图】进入：预填提示词为导向
    const tid = sp.get("topic");
    const k = sp.get("kind");
    if (k === "image" || k === "video") setKind(k);
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
    if (!confirmed) return toast.error("请先确认提示词配置");
    if (kind === "image" && !activeModels.image)
      return toast.error("请先在「图像/视频」中配置图像模型");
    if (kind === "video" && !activeModels.video)
      return toast.error("请先在「图像/视频」中配置视频模型");
    setGen(true);
    setResult(null);
    setSegments([]);
    const params: Record<string, string> = { ratio, style, scene, usage, duration, resolution, storyboard, bgm, model: activeModels[kind] || "" };
    const configuredPrompt = [prompt, `用途：${usage}`, `风格：${style}`, `画面比例：${ratio}`, scene && `模特与场景：${scene}`, kind === "video" && `时长：${duration} 秒；分辨率：${resolution}`, kind === "video" && storyboard && `分镜：${storyboard}`, kind === "video" && bgm && `BGM：${bgm}`, kind === "video" && Number(duration) > 15 && "拆分为两段不超过 15 秒且首尾动作连续的镜头，生成后按顺序剪辑衔接。"].filter(Boolean).join("\n");
    try {
      const request = await trackRequest(kind, prompt, params, "params_confirmed", "用户逐项确认参数后开始生成", "confirmed");
      const r = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt:
            kind === "image"
              ? `医疗合规：毛发移植/植发相关，自然真实，禁止夸大疗效。${configuredPrompt}`
              : configuredPrompt,
          surgery_type: surgery,
          patient_code: patientCode || null,
          content_id: contentId || null,
          media_request_id: request?.id ?? null,
          ratio,
          style,
          scene,
          usage,
          duration,
          resolution,
          storyboard,
          bgm,
          filename: `${kind === "video" ? "视频" : "配图"}-${Date.now()}`,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成失败");
      const firstAsset = d.asset || d.assets?.[0];
      if (firstAsset) setResult({ url: firstAsset.file_url, file_type: firstAsset.file_type });
      if (d.segments?.length) {
        setSegments(d.segments.map((s: { label: string; prompt: string; url: string | null }) => ({ label: s.label, prompt: s.prompt, url: s.url })));
        toast.success(`已生成长视频拆段 ${d.segments.length} 段并存入素材库`);
      } else {
        toast.success("已生成并存入素材库");
      }
      await refreshMediaRequests();
    } catch (e: any) {
      toast.error(e.message || "生成失败");
      await refreshMediaRequests();
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
    setSegments([]);
    try {
      const request = await trackRequest("image", plan.prompt || prompt, { ratio, style, scene, usage, category: plan.category }, "skill_prompt_confirmed", "按 Skill 提示词生成配图", "confirmed");
      const r = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image",
          prompt: `医疗合规：禁止夸大疗效。${plan.prompt || prompt}`,
          category: plan.category || "科普图示",
          surgery_type: null,
          patient_code: null,
          media_request_id: request?.id ?? null,
          ratio,
          style,
          scene,
          usage,
          filename: `${c.title.slice(0, 20)}-配图-${Date.now()}`,
          content_id: c.id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "生成失败");
      setResult({ url: d.asset.file_url, file_type: d.asset.file_type });
      setSyncedId(d.asset.id);
      await refreshMediaRequests();
      toast.success(
        d.attachedContentId
          ? `已生成并自动设为「${c.title}」的封面`
          : `已生成并自动进入素材库「${d.asset.category}」`
      );
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>画面比例</Label><Select value={ratio} onValueChange={(v) => setRatio(v ?? "3:4")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["1:1", "3:4", "4:3", "9:16", "16:9"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>风格</Label><Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="真实医疗纪实" /></div>
            </div>
            <div className="space-y-1"><Label>模特与场景</Label><Input value={scene} onChange={(e) => setScene(e.target.value)} placeholder="如：30 岁韩国男性，医院咨询室，自然光" /></div>
            <div className="space-y-1"><Label>用途</Label><Input value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="如：小红书封面 / 正文配图" /></div>
            {kind === "video" && <>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>时长（秒）</Label><Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} /></div><div className="space-y-1"><Label>分辨率</Label><Select value={resolution} onValueChange={(v) => setResolution(v ?? "1080p")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["720p", "1080p", "4K"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="space-y-1"><Label>分镜</Label><textarea value={storyboard} onChange={(e) => setStoryboard(e.target.value)} rows={3} className="w-full rounded-xl border border-[#e4e0e6] px-3 py-2 text-sm" placeholder="逐镜头写画面、动作、台词与时间" /></div>
              <div className="space-y-1"><Label>BGM</Label><Input value={bgm} onChange={(e) => setBgm(e.target.value)} placeholder="如：克制、可信赖、无歌词" /></div>
              {Number(duration) > 15 && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">超过 15 秒：提示词会自动拆为两段连续镜头，生成后按顺序剪辑。</p>}
            </>}
            <label className="flex items-start gap-2 rounded-xl border border-[#e4e0e6] bg-[#faf8f6] p-3 text-xs text-[#514b46]"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /><span>我已逐项确认提示词、{kind === "image" ? "风格、比例、模特场景和用途" : "时长、比例、分辨率、风格、模特场景、分镜和 BGM"}，可以生成。</span></label>
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
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={run} disabled={gen || !confirmed} className="w-full" variant="outline">
                {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {gen ? "生成中…" : "直接生成"}
              </Button>
              <Button
                onClick={() => {
                  if (!prompt.trim()) return toast.error("请先填提示词");
                  setCaptainTask(`为 Koreahospital 项目生成${kind === "image" ? "配图" : "短视频"}。提示词：「${prompt}」。请队长拉对应的设计/视频 skill 自动跑，并按平台合规要求调整。`);
                  setCaptainOpen(true);
                }}
                disabled={!prompt.trim()}
                className="w-full"
              >
                <Wand2 className="h-4 w-4" /> 通过总控生成
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>预览</CardTitle></CardHeader>
          <CardContent>
            {segments.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="text-xs font-medium text-[#514b46]">长视频分段（已按顺序生成，可复制提示词到外部生成/拼接）</div>
                {segments.map((s, i) => (
                  <div key={i} className="rounded-xl border border-[#e4e0e6] bg-white p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#211e1c]">{s.label || `第 ${i + 1} 段`}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copyText(s.prompt)}><Copy className="h-3 w-3" /> 复制</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => exportPrompt(s.prompt, `视频分段${i + 1}`)}><Download className="h-3 w-3" /> 导出</Button>
                      </div>
                    </div>
                    {s.url && <video src={s.url} controls className="mt-2 w-full rounded-lg bg-black" />}
                  </div>
                ))}
              </div>
            )}
            {gen || genFromContent ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-[#f6f4f5] text-sm text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 模型生成中…
              </div>
            ) : result ? (
              result.file_type === "video" ? (
                // 视频：9:16 竖屏容器（抖音 / 小红书视频主比例），object-contain 不裁人脸
                <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl bg-black" style={{ aspectRatio: ratio.replace(":", " / ") }}>
                  <video src={result.url} controls className="absolute inset-0 h-full w-full object-contain" />
                </div>
              ) : (
                // 配图：3:4 容器（小红书 / 公众号头图主比例）
                <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl bg-[#f6f4f5]" style={{ aspectRatio: ratio.replace(":", " / ") }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.url} alt="生成结果" className="absolute inset-0 h-full w-full object-contain" />
                </div>
              )
            ) : (
              <div className="mx-auto flex w-full max-w-[520px] items-center justify-center rounded-xl bg-[#f6f4f5] text-sm text-zinc-400" style={{ aspectRatio: ratio.replace(":", " / ") }}>
                按 {ratio} 预览；生成后自动进入素材库{contentId ? "并关联所选内容" : ""}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> 参数确认与生成记录（可追踪多轮）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mediaRequests.length === 0 ? (
            <p className="text-xs text-[#89828d]">暂无记录。点击「直接生成」前会先落一条媒体请求，记录参数确认轮次与产物，便于回看与复盘。</p>
          ) : (
            <div className="space-y-2">
              {mediaRequests.slice(0, 10).map((m) => (
                <div key={m.id} className="rounded-xl border border-[#e4e0e6] bg-[#faf8f6] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`pill ${m.kind === "video" ? "bg-violet-100 text-violet-600" : "bg-rose-100 text-rose-600"}`}>#{m.id} {m.kind === "video" ? "视频" : "配图"}</span>
                    <span className={`pill ${m.status === "done" ? "bg-emerald-100 text-emerald-600" : m.status === "failed" ? "bg-red-100 text-red-600" : "bg-[#ecedf2] text-[#717a94]"}`}>{mediaStatusLabel(m.status)}</span>
                    <span className="text-[11px] text-[#89828d]">{m.rounds.length} 轮确认 · {m.asset_ids.length} 个素材 · {m.created_at}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#43394c]">{m.prompt}</p>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-[#717a94]">
                    {Object.entries(m.params || {}).filter(([, v]) => v).map(([k, v]) => (
                      <span key={k} className="rounded bg-white px-1.5 py-0.5">{k}:{String(v)}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => copyText(composeRequestPrompt(m))}><Copy className="h-3 w-3" /> 复制提示词</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => exportPrompt(composeRequestPrompt(m), `media-request-${m.id}`)}><Download className="h-3 w-3" /> 导出 .txt</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CaptainPlanDialog
        open={captainOpen}
        onClose={() => setCaptainOpen(false)}
        task={captainTask}
        input={{ pathname: "/assets/generate", kind, prompt }}
        title="总控生成任务"
      />
    </div>
  );
}
