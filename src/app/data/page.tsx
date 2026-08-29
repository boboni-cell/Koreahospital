"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart } from "@/components/charts/charts";

interface Metrics {
  totalFollowers: number;
  delta: number;
  growth: number;
  engagement: number;
}
interface SeriesPoint {
  date: string;
  followers: number;
  likes: number;
  views: number;
  saves: number;
}

export default function DataPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics").then((r) => r.json()),
      fetch("/api/metrics/series").then((r) => r.json()),
    ])
      .then(([mm, ss]) => {
        setM(mm);
        setSeries(ss);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-stone-900">数据看板</h2>
      {loading ? (
        <p className="text-sm text-stone-400">加载中…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat title="总粉丝" value={(m?.totalFollowers ?? 0).toLocaleString()} tone="text-rose-500" />
            <Stat title="粉丝增量" value={`+${(m?.delta ?? 0).toLocaleString()}`} tone="text-emerald-500" />
            <Stat title="增长率" value={`${m?.growth ?? 0}%`} tone="text-indigo-500" />
            <Stat title="互动率" value={`${m?.engagement ?? 0}%`} tone="text-sky-500" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-600">粉丝增长趋势（近 14 天）</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={series} field="followers" color="#fb7185" unit="粉丝 " />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-600">每日点赞 vs 播放</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
                    <span className="h-2 w-2 rounded-full bg-rose-400" /> 点赞
                  </div>
                  <BarChart data={series} field="likes" color="#fb7185" />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
                    <span className="h-2 w-2 rounded-full bg-sky-400" /> 播放
                  </div>
                  <BarChart data={series} field="views" color="#38bdf8" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-stone-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
