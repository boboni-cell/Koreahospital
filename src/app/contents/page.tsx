"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Trash2, CheckCircle2 } from "lucide-react";
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
  scheduled_for: string | null;
  cover_url: string | null;
}

const PLATFORM: Record<string, string> = { xiaohongshu: "小红书", douyin: "抖音" };
const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

export default function ContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [drafts, setDrafts] = useState<{ [id: number]: string }>({});

  const load = useCallback(() => {
    fetch("/api/contents").then((r) => r.json()).then((d: Content[]) => setItems(d));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function del(c: Content) {
    if (!confirm(`确认删除内容「${c.title}」？`)) return;
    const r = await fetch(`/api/contents/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      load();
    } else toast.error("删除失败");
  }

  async function setSchedule(c: Content) {
    const t = drafts[c.id];
    if (!t) return toast.error("请先选择发布时间");
    const r = await fetch(`/api/contents/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_for: t }),
    });
    if (r.ok) {
      toast.success("已设置发布时间，并同步到内容排期");
      load();
    } else toast.error("设置失败");
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-stone-900">内容管理</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-2 pt-4">
              <div className="flex items-center justify-between">
                <Badge>{PLATFORM[c.platform] ?? c.platform}</Badge>
                <span className="text-xs text-stone-400">{ROLE[c.role] ?? c.role}</span>
              </div>
              <div className="text-sm font-medium text-stone-800">{c.title}</div>
              {c.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover_url} alt="封面" className="h-24 w-full rounded-lg object-cover" />
              )}
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <CalendarClock className="h-3.5 w-3.5" />
                {c.scheduled_for ? c.scheduled_for.slice(0, 16).replace("T", " ") : "未排期"}
                {c.scheduled_for && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              </div>

              <div className="mt-auto flex items-center gap-1.5 pt-1">
                <input
                  type="datetime-local"
                  value={drafts[c.id] ?? ""}
                  onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                  className="h-8 flex-1 rounded-lg border border-stone-200 px-2 text-xs focus:outline-none"
                />
                <Button size="sm" variant="outline" onClick={() => setSchedule(c)}>
                  排期
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => del(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {items.length === 0 && <p className="mt-6 text-sm text-stone-400">暂无内容。</p>}
    </PageFrame>
  );
}
