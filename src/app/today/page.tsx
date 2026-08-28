"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Content {
  id: number;
  title: string;
  platform: string;
  role: string;
  status: string;
  scheduled_for: string | null;
}

export default function TodayPage() {
  const [items, setItems] = useState<Content[]>([]);
  useEffect(() => {
    fetch("/api/contents")
      .then((r) => r.json())
      .then((d) => setItems(d.slice(0, 12)));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">今日待发</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Badge>{c.platform ?? "—"}</Badge>
                <span className="text-xs text-zinc-400">{c.role ?? ""}</span>
              </div>
              <div className="text-sm font-medium text-zinc-800">{c.title}</div>
              <div className="text-xs text-zinc-400">状态：{c.status}</div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-zinc-400">暂无内容，去 AI 文案工坊生成吧。</p>
        )}
      </div>
    </PageFrame>
  );
}
