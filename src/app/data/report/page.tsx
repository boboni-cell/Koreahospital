"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, CalendarRange, CalendarCheck } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ReportRow {
  date: string;
  posts: number;
  likes: number;
  saves: number;
  comments: number;
  shares: number;
  views: number;
}
interface ReportContent {
  id: number;
  title: string;
  platform: string;
  role: string;
  published_at: string | null;
  data_filled: number;
  likes: number;
  views: number;
}
interface Report {
  range: string;
  start: string;
  end: string;
  rows: ReportRow[];
  contents: ReportContent[];
  totals: { posts: number; likes: number; saves: number; comments: number; shares: number; views: number };
}

const PLATFORM: Record<string, string> = { xiaohongshu: "小红书", douyin: "抖音" };
const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

export default function DataReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<"day" | "week">("week");

  const load = (r: "day" | "week") => {
    setLoading(true);
    setRange(r);
    fetch(`/api/reports?range=${r}`)
      .then((res) => res.json())
      .then(setReport)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load("week");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportCsv() {
    if (!report) return;
    setBusy(true);
    try {
      const head = "日期,发布数,点赞,收藏,评论,分享,播放\n";
      const rows = report.rows
        .map((m) => `${m.date},${m.posts},${m.likes},${m.saves},${m.comments},${m.shares},${m.views}`)
        .join("\n");
      const cHead = "\n\n内容ID,标题,平台,角色,发布时间,已回填,点赞,播放\n";
      const cRows = report.contents
        .map((c) => `${c.id},"${String(c.title).replace(/"/g, '""')}",${PLATFORM[c.platform] ?? c.platform},${c.role},${c.published_at ?? ""},${c.data_filled ? "是" : "否"},${c.likes},${c.views}`)
        .join("\n");
      const csv = "\ufeff" + head + rows + cHead + cRows;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `运营报表_${report.range}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("已导出 CSV");
    } catch {
      toast.error("导出失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">报表中心</h2>
        <Button onClick={exportCsv} disabled={busy || !report}>
          <Download className="h-4 w-4" /> {busy ? "导出中…" : "导出 CSV"}
        </Button>
      </div>

      <Tabs.Root value={range} onValueChange={(v) => load((v as "day") || "week")}>
        <TabsList className="mb-4">
          <TabsTrigger value="week"><CalendarRange className="mr-1 h-3.5 w-3.5" /> 周报</TabsTrigger>
          <TabsTrigger value="day"><CalendarCheck className="mr-1 h-3.5 w-3.5" /> 日报</TabsTrigger>
        </TabsList>

        <TabsContent value={range}>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-[#89828d]">
              <Loader2 className="h-4 w-4 animate-spin" /> 汇总中…
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* 合计卡 */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <Metric label="发布数" value={report.totals.posts} />
                <Metric label="点赞" value={report.totals.likes} />
                <Metric label="收藏" value={report.totals.saves} />
                <Metric label="评论" value={report.totals.comments} />
                <Metric label="分享" value={report.totals.shares} />
                <Metric label="播放" value={report.totals.views} />
              </div>

              {/* 按日趋势 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-[#43394c]">
                    按日汇总（{report.start} ~ {report.end}）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.rows.length === 0 ? (
                    <p className="text-sm text-[#89828d]">该区间还没有回填数据的发布内容。</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[#89828d]">
                          <th className="py-1">日期</th><th>发布</th><th>点赞</th><th>收藏</th><th>评论</th><th>分享</th><th>播放</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((r) => (
                          <tr key={r.date} className="border-t border-[#ecedf2]">
                            <td className="py-1.5 text-[#31263b]">{r.date}</td>
                            <td>{r.posts}</td><td>{r.likes}</td><td>{r.saves}</td>
                            <td>{r.comments}</td><td>{r.shares}</td><td>{r.views}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* 内容清单 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-[#43394c]">
                    已发布内容（{report.contents.length}）
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.contents.length === 0 && (
                    <p className="text-sm text-[#89828d]">该区间没有已发布内容。</p>
                  )}
                  {report.contents.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl bg-[#f6f4f5] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#01011b]">{c.title}</div>
                        <div className="mt-0.5 text-xs text-[#89828d]">
                          {PLATFORM[c.platform] ?? c.platform} · {ROLE[c.role] ?? c.role}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#717a94]">
                        <span>👍 {c.likes} · 👁 {c.views}</span>
                        <Badge className={c.data_filled ? "bg-emerald-100 text-emerald-600" : "bg-[#ecedf2] text-[#89828d]"}>
                          {c.data_filled ? "已回填" : "待回填"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs.Root>
    </PageFrame>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[11px] text-[#89828d]">{label}</div>
        <div className="mt-1 text-xl font-semibold text-[#01011b]">{value}</div>
      </CardContent>
    </Card>
  );
}
