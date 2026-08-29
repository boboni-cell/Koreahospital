"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Topic {
  id: number;
  title: string;
  description: string | null;
  source: string;
  heat_score: number;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const router = useRouter();
  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => setTopics(d));
  }, []);

  function genCopy(t: Topic) {
    router.push(`/contents/ai?topic=${t.id}`);
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
              <Button size="sm" variant="outline" className="w-full" onClick={() => genCopy(t)}>
                生成文案
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}
