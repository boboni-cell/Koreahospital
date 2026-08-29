"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DataReportPage() {
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const [metrics, contents] = await Promise.all([
        fetch("/api/metrics/series").then((r) => r.json()),
        fetch("/api/contents").then((r) => r.json()),
      ]);

      const mHead = "日期,粉丝,点赞,播放,收藏\n";
      const mRows = (metrics as any[])
        .map((m) => `${m.date},${m.followers},${m.likes},${m.views},${m.saves}`)
        .join("\n");
      const cHead = "\n\n内容ID,标题,平台,角色,状态,创建时间\n";
      const cRows = (contents as any[])
        .map((c) => `${c.id},"${String(c.title).replace(/"/g, '""')}",${c.platform},${c.role},${c.status},${c.created_at ?? ""}`)
        .join("\n");

      const csv = "﻿" + mHead + mRows + cHead + cRows;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `运营报表_${new Date().toISOString().slice(0, 10)}.csv`;
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
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-stone-900">报表中心</h2>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-stone-500">
            一键导出运营数据报表（含每日指标趋势 + 内容清单），CSV 格式，可直接用 Excel / 飞书表格打开。
          </p>
          <Button onClick={exportCsv} disabled={busy}>
            <Download className="h-4 w-4" /> {busy ? "导出中…" : "导出 CSV 报表"}
          </Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
