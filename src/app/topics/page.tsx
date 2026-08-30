"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, MessageSquarePlus, Image as ImageIcon, Clapperboard } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContentComp,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [script, setScript] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const router = useRouter();

  const load = () =>
    fetch("/api/topics").then((r) => r.json()).then((d) => setTopics(d));
  useEffect(() => {
    load();
  }, []);

  function genCopy(t: Topic) {
    router.push(`/contents/ai?topic=${t.id}`);
  }
  function genImage(t: Topic) {
    router.push(`/assets/generate?topic=${t.id}`);
  }

  async function genScript(t: Topic) {
    setScriptTopic(t);
    setScript("");
    setScriptLoading(true);
    try {
      const r = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: { title: t.title, description: t.description || "", role: "viral", platform: "douyin" },
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">选题池</h2>
        <Badge className="bg-rose-100 text-rose-600">{topics.length} 个</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Badge>热度 {t.heat_score}</Badge>
                <span className="text-xs text-stone-400">
                  {t.source === "adopted" ? "已采纳" : "手动"}
                </span>
              </div>
              <div className="text-sm font-medium text-stone-800">{t.title}</div>
              {t.description && (
                <p className="line-clamp-2 text-xs text-stone-500">{t.description}</p>
              )}
              {/* 生成链路：文案 / 配图 / 视频脚本 */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <Button size="sm" variant="outline" onClick={() => genCopy(t)}>
                  <MessageSquarePlus className="h-3.5 w-3.5" /> 文案
                </Button>
                <Button size="sm" variant="outline" onClick={() => genImage(t)}>
                  <ImageIcon className="h-3.5 w-3.5" /> 配图
                </Button>
                <Button size="sm" variant="outline" onClick={() => genScript(t)}>
                  <Clapperboard className="h-3.5 w-3.5" /> 脚本
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
        <p className="mt-6 text-sm text-stone-400">暂无选题，去「选题研究」生成吧。</p>
      )}

      {/* 视频脚本弹窗 */}
      {scriptTopic && (
        <DialogRoot open onOpenChange={(o) => !o && setScriptTopic(null)}>
          <DialogContentComp className="max-w-3xl">
            <DialogClose>
              <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200">
                ✕
              </button>
            </DialogClose>
            <div className="space-y-3 p-5">
              <h3 className="text-base font-semibold text-stone-900">视频脚本 · {scriptTopic.title}</h3>
              {scriptLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-stone-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> 正在用 video-storyboard skill 生成拍摄脚本…
                </div>
              ) : script ? (
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
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
