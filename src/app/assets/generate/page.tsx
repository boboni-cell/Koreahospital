"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, ImageIcon, Video } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
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

export default function GeneratePage() {
  const [kind, setKind] = useState<GenKind>("image");
  const [activeModels, setActiveModels] = useState<{ image?: string; video?: string }>({});
  const [prompt, setPrompt] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [surgery, setSurgery] = useState("FUE");
  const [gen, setGen] = useState(false);
  const [result, setResult] = useState<{ url: string; file_type: string } | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((list: any[]) => {
        const img = list.find((m) => m.kind === "image" && m.isActive);
        const vid = list.find((m) => m.kind === "video" && m.isActive);
        setActiveModels({ image: img?.name, video: vid?.name });
      })
      .catch(() => {});
  }, []);

  async function run() {
    if (!prompt.trim()) return toast.error("请填写生成提示词");
    if (kind === "image" && !activeModels.image)
      return toast.error("没有启用中的图像模型，请先在「模型管理」添加并启用");
    if (kind === "video" && !activeModels.video)
      return toast.error("没有启用中的视频模型，请先在「模型管理」添加并启用");
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

  return (
    <PageFrame>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-zinc-900">AI 生成配图 / 视频</h2>
      <p className="mb-4 text-sm text-zinc-500">
        生成结果自动存入素材库。图像模型：{activeModels.image ? `✓ ${activeModels.image}` : "未启用"} ｜
        视频模型：{activeModels.video ? `✓ ${activeModels.video}` : "未启用"}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> 生成设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>类型</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as GenKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" /> 图像配图
                    </span>
                  </SelectItem>
                  <SelectItem value="video">
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" /> 短视频
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>提示词（{kind === "image" ? "画面描述" : "镜头/动态描述"}）</Label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none"
                placeholder={
                  kind === "image"
                    ? "如：韩国医院无菌层流手术室俯拍，暖光，真实医疗场景"
                    : "如：发际线种植术后 180 天恢复过程快剪，自然光，无特效字幕"
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>手术类型</Label>
                <Select value={surgery} onValueChange={(v) => setSurgery(v ?? "FUE")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURGERY_TYPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>患者编号（可选）</Label>
                <Input
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  placeholder="P-2026-001"
                />
              </div>
            </div>
            <Button onClick={run} disabled={gen} className="w-full">
              {gen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {gen ? "生成中…" : `生成${kind === "image" ? "配图" : "视频"}`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>预览</CardTitle>
          </CardHeader>
          <CardContent>
            {gen ? (
              <div className="flex h-64 items-center justify-center rounded-xl bg-stone-50 text-sm text-zinc-400">
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
              <div className="flex h-64 items-center justify-center rounded-xl bg-stone-50 text-sm text-zinc-400">
                生成后在此预览，并自动进入素材库
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
