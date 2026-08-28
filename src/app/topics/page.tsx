"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: number;
  title: string;
  description: string | null;
  source: string;
  heat_score: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then((d) => setTopics(d));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">选题池</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <Badge>热度 {t.heat_score}</Badge>
                <span className="text-xs text-zinc-400">{t.source}</span>
              </div>
              <div className="text-sm font-medium text-zinc-800">{t.title}</div>
              {t.description && <p className="text-xs text-zinc-500">{t.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}
