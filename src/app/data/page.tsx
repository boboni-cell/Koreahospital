"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Metrics {
  totalFollowers: number;
  delta: number;
  growth: number;
  engagement: number;
  totalViews: number;
  lastDate: string | null;
}

export default function DataPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => setM(d))
      .finally(() => setLoading(false));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">数据看板</h2>
      {loading ? (
        <p className="text-sm text-zinc-400">加载中…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="总粉丝" value={(m?.totalFollowers ?? 0).toLocaleString()} />
          <Stat title="粉丝增量" value={`+${(m?.delta ?? 0).toLocaleString()}`} />
          <Stat title="增长率" value={`${m?.growth ?? 0}%`} />
          <Stat title="互动率" value={`${m?.engagement ?? 0}%`} />
        </div>
      )}
    </PageFrame>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-zinc-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</div>
      </CardContent>
    </Card>
  );
}
