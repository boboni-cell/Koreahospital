"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Content {
  id: number;
  title: string;
  body: string;
  platform: string;
  role: string;
  status: string;
}

const PLATFORM: Record<string, string> = { xiaohongshu: "小红书", douyin: "抖音" };
const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

export default function TodayList() {
  const [items, setItems] = useState<Content[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    fetch("/api/contents")
      .then((r) => r.json())
      .then((d: Content[]) => setItems(d));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = items.filter((c) => c.status !== "published");
  const done = items.filter((c) => c.status === "published");

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyText(c: Content) {
    navigator.clipboard.writeText(`${c.title}\n\n${c.body}`).then(() => {
      setCopied(c.id);
      toast.success("文案已复制，去小红书/抖音粘贴发布吧");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function markPublished(id: number) {
    fetch(`/api/contents/${id}/publish`, { method: "POST" })
      .then(() => {
        toast.success("已标记为已发布");
        load();
      })
      .catch(() => toast.error("标记失败"));
  }

  if (pending.length === 0)
    return (
      <div className="surface rounded-2xl p-8 text-center text-sm text-stone-400">
        暂无待发内容，去「AI 文案工坊」生成吧。
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-rose-100 text-rose-600">待发 {pending.length}</Badge>
        <p className="text-xs text-stone-400">
          确认后点「复制文案」去平台手动粘贴发布，再点「标记已发布」。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pending.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-3 pt-4">
              <div className="flex items-center justify-between">
                <Badge>{PLATFORM[c.platform] ?? c.platform}</Badge>
                <span className="text-xs text-stone-400">{ROLE[c.role] ?? c.role}</span>
              </div>
              <div className="text-sm font-semibold text-stone-800">{c.title}</div>
              <p
                className={`flex-1 text-xs leading-relaxed text-stone-500 ${
                  expanded.has(c.id) ? "" : "line-clamp-4"
                }`}
              >
                {c.body}
              </p>
              {(c.body?.length ?? 0) > 120 && (
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="self-start text-xs text-rose-500 hover:text-rose-600"
                >
                  {expanded.has(c.id) ? "收起 ▲" : "显示全部 ▼"}
                </button>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyText(c)}>
                  {copied === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === c.id ? "已复制" : "复制文案"}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => markPublished(c.id)}>
                  标记已发布
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
