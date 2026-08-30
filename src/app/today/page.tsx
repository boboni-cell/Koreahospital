"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
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

const PLATFORM: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
};
const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

export default function TodayPage() {
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

  function copyText(c: Content) {
    const text = `${c.title}\n\n${c.body}`;
    navigator.clipboard.writeText(text).then(() => {
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

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">今日一键发布</h2>
        <Badge className="bg-rose-100 text-rose-600">待发 {pending.length}</Badge>
      </div>

      <p className="mb-5 text-xs text-stone-400">
        确认内容后点「复制文案」去小红书 / 抖音手动粘贴发布，回来点「标记已发布」。
      </p>

      {pending.length === 0 && (
        <div className="surface rounded-2xl p-8 text-center text-sm text-stone-400">
          暂无待发内容，去 <a href="/contents/ai" className="text-rose-500 underline">AI 文案工坊</a> 生成吧。
        </div>
      )}

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
                className={`line-clamp-4 flex-1 text-xs leading-relaxed text-stone-500 ${
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
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyText(c)}
                >
                  {copied === c.id ? (
                    <><Check className="h-4 w-4" /> 已复制</>
                  ) : (
                    <><Copy className="h-4 w-4" /> 复制文案</>
                  )}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => markPublished(c.id)}>
                  标记已发布
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-stone-400">今日已发布（{done.length}）</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((c) => (
              <div key={c.id} className="surface flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-stone-500">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="truncate">{c.title}</span>
                <span className="ml-auto text-[10px] text-stone-400">{PLATFORM[c.platform] ?? c.platform}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageFrame>
  );
}
