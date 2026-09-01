"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, MessageSquarePlus, Image as ImageIcon, Clapperboard, FileText, Sparkles } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContentComp,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { VIDEO_SCRIPT_TYPES } from "@/lib/constants";

interface Topic {
  id: number;
  title: string;
  description: string | null;
  source: string;
  heat_score: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scriptTopic, setScriptTopic] = useState<Topic | null>(null);
  const [scriptType, setScriptType] = useState("doctor");
  const [script, setScript] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTheme, setBulkTheme] = useState("");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "trending" | "adopted" | "manual">("all");
  const router = useRouter();

  const load = () =>
    fetch("/api/topics").then((r) => r.json()).then((d) => setTopics(d));
  useEffect(() => {
    load();
  }, []);

  function genCopy(t: Topic) {
    router.push(`/contents/ai?topic=${t.id}`);
  }
  function genImageText(t: Topic) {
    // 图文生成：跳到 AI 生成页,默认 image 模式
    router.push(`/assets/generate?topic=${t.id}&kind=image`);
  }
  function genVideo(t: Topic) {
    router.push(`/assets/generate?topic=${t.id}&kind=video`);
  }
  function genText(t: Topic) {
    // 文本生成：用 AI 视频脚本 skill 生成纯文字稿（可复制当文案）
    router.push(`/contents/ai?topic=${t.id}&mode=text`);
  }

  async function genScript(t?: Topic) {
    const target = t ?? scriptTopic;
    if (!target) return;
    setScriptTopic(target);
    setScript("");
    setScriptLoading(true);
    try {
      const r = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: { title: target.title, description: target.description || "", role: "viral", platform: "douyin", type: scriptType },
        }),
      });
      const d = await r.json();
      if (d.script) setScript(d.script);
      else toast.error(d.note || "生成失败");
    } catch {
      toast.error("生成失败");
    } finally {
      setScriptLoading(false);
    }
  }

  async function del(t: Topic) {
    if (!confirm(`确认删除选题「${t.title}」？`)) return;
    const r = await fetch(`/api/topics?id=${t.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      load();
    } else toast.error("删除失败");
  }

  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">选题池</h2>
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-100 text-rose-600">{topics.length} 个</Badge>
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            <Sparkles className="h-4 w-4" /> 从热点批量生成
          </Button>
        </div>
      </div>

      {/* 从热点批量生成对话框 */}
      {bulkOpen && (
        <DialogRoot open onOpenChange={(o) => !o && setBulkOpen(false)}>
          <DialogContentComp className="max-w-md">
            <DialogClose>
              <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#ecedf2] text-[#717a94]">✕</button>
            </DialogClose>
            <div className="space-y-3 p-5">
              <h3 className="text-base font-semibold text-[#01011b]">从热点批量生成选题</h3>
              <div className="space-y-1">
                <Label>热点主题（如「夏季脱发」「发际线种植」）</Label>
                <Input value={bulkTheme} onChange={(e) => setBulkTheme(e.target.value)} placeholder="例如：FUE 术后护理" />
              </div>
              <div className="space-y-1">
                <Label>生成条数（1-20）</Label>
                <Input type="number" min={1} max={20} value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value || 1))} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setBulkOpen(false)}>取消</Button>
                <Button
                  disabled={bulkLoading || !bulkTheme.trim()}
                  onClick={async () => {
                    setBulkLoading(true);
                    try {
                      const r = await fetch("/api/topics/bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ theme: bulkTheme, count: bulkCount }),
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error || "生成失败");
                      toast.success(`已生成 ${d.count} 条选题`);
                      setBulkOpen(false);
                      setBulkTheme("");
                      load();
                    } catch (e: any) {
                      toast.error(e.message || "生成失败");
                    } finally {
                      setBulkLoading(false);
                    }
                  }}
                >
                  {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {bulkLoading ? "生成中…" : "生成"}
                </Button>
              </div>
            </div>
          </DialogContentComp>
        </DialogRoot>
      )}

      {/* 来源筛选：trending = AI 批量生成、adopted = 从选题研究采纳、manual = 手工录入 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          { id: "all", label: `全部 ${topics.length}` },
          { id: "trending", label: `AI 批量 ${topics.filter((t) => t.source === "trending").length}` },
          { id: "adopted", label: `已采纳 ${topics.filter((t) => t.source === "adopted").length}` },
          { id: "manual", label: `手工 ${topics.filter((t) => (t.source ?? "manual") === "manual").length}` },
        ] as const).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSourceFilter(opt.id)}
            className={
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
              (sourceFilter === opt.id ? "bg-[#31263b] text-white" : "bg-[#ecedf2] text-[#717a94] hover:bg-[#ecedf2]")
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(sourceFilter === "all" ? topics : topics.filter((t) => (t.source ?? "manual") === sourceFilter)).map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Badge>热度 {t.heat_score}</Badge>
                <span className="text-xs text-[#89828d]">
                  {t.source === "adopted" ? "已采纳" : "手动"}
                </span>
              </div>
              <div className="text-sm font-medium text-[#01011b]">{t.title}</div>
              {t.description && (
                <p className="line-clamp-2 text-xs text-[#717a94]">{t.description}</p>
              )}
              {/* 生成链路：文案 / 图文 / 视频 / 文本 */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <Button size="sm" variant="outline" onClick={() => genCopy(t)} title="生成文案">
                  <MessageSquarePlus className="h-3.5 w-3.5" /> 文案
                </Button>
                <Button size="sm" variant="outline" onClick={() => genImageText(t)} title="图文生成">
                  <ImageIcon className="h-3.5 w-3.5" /> 图文
                </Button>
                <Button size="sm" variant="outline" onClick={() => genVideo(t)} title="视频生成">
                  <Clapperboard className="h-3.5 w-3.5" /> 视频
                </Button>
                <Button size="sm" variant="outline" onClick={() => genText(t)} title="文本生成">
                  <FileText className="h-3.5 w-3.5" /> 文本
                </Button>
              </div>
              <button
                onClick={() => del(t)}
                className="mx-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" /> 删除选题
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
      {topics.length === 0 && (
        <p className="mt-6 text-sm text-[#89828d]">暂无选题，去「选题研究」生成吧。</p>
      )}

      {/* 视频脚本弹窗 */}
      {scriptTopic && (
        <DialogRoot open onOpenChange={(o) => !o && setScriptTopic(null)}>
          <DialogContentComp className="max-w-3xl">
            <DialogClose>
              <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#ecedf2] text-[#717a94] hover:bg-[#ecedf2]">
                ✕
              </button>
            </DialogClose>
            <div className="space-y-3 p-5">
              <h3 className="text-base font-semibold text-[#01011b]">视频脚本 · {scriptTopic.title}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#89828d]">脚本类型</span>
                <Select value={scriptType} onValueChange={(v) => setScriptType(v ?? "doctor")}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIDEO_SCRIPT_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => genScript()} disabled={scriptLoading}>
                  {scriptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
                  {scriptLoading ? "生成中…" : "按此类型生成"}
                </Button>
              </div>
              {scriptLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[#89828d]">
                  <Loader2 className="h-4 w-4 animate-spin" /> 正在用 video-storyboard skill 生成拍摄脚本…
                </div>
              ) : script ? (
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-[#f6f4f5] p-4 text-sm leading-relaxed text-[#31263b]">
{script}
                </pre>
              ) : null}
              {script && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(script);
                      toast.success("脚本已复制");
                    }}
                  >
                    复制脚本
                  </Button>
                  <Button variant="outline" onClick={() => router.push(`/contents/ai?topic=${scriptTopic.id}`)}>
                    → 转文案
                  </Button>
                </div>
              )}
            </div>
          </DialogContentComp>
        </DialogRoot>
      )}
    </PageFrame>
  );
}
