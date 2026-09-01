"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, RefreshCw, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toCsv } from "@/lib/csv";

interface UploadRecord {
  id: number;
  rows_count: number;
  inserted: number;
  skipped: number;
  created_at: string;
}

export function DataUploadRecords({ refreshKey = 0 }: { refreshKey?: number }) {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const downloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    "\uFEFF" +
      toCsv(
        ["时间", "总行数", "成功", "跳过"],
        records.map((r) => [r.created_at, r.rows_count, r.inserted, r.skipped])
      )
  )}`;

  useEffect(() => {
    setLoading(true);
    fetch("/api/metrics/uploads")
      .then(async (r) => {
        if (!r.ok) throw new Error("加载失败");
        setRecords(await r.json());
      })
      .catch(() => toast.error("上传记录加载失败"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function deleteRecord(id: number) {
    if (!confirm("确定删除这条上传记录吗？这不会删除已录入的运营数据。")) return;
    try {
      const response = await fetch(`/api/metrics/uploads?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除失败");
      toast.success("上传记录已删除");
      setRecords((r) => r.filter((x) => x.id !== id));
    } catch {
      toast.error("删除失败");
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/metrics/uploads");
      if (!response.ok) throw new Error("刷新失败");
      setRecords(await response.json());
    } catch {
      toast.error("刷新失败");
    } finally {
      setLoading(false);
    }
  }

  if (!loading && records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#01011b]">已上传记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-zinc-400">
            <p>暂无上传记录</p>
            <p className="mt-1 text-sm text-zinc-500">从「CSV 批量分析」上传数据后，此处会显示...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[#01011b]">
          <div className="flex items-center justify-between">
            <span>已上传记录</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
                title="刷新上传记录"
                aria-label="刷新上传记录"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <a
                href={downloadHref}
                download="数据上传记录.csv"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
                title="导出上传记录"
                aria-label="导出上传记录"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-zinc-400">加载中…</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-100">
            <table className="w-full min-w-[500px] border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">时间</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">总行数</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">成功</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">跳过</th>
                  <th className="px-3 py-2 text-center font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                    <td className="px-3 py-2 text-zinc-700">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{r.rows_count}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{r.inserted}</td>
                    <td className="px-3 py-2 text-right text-rose-500">{r.skipped}</td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRecord(r.id)}
                        className="text-rose-500 hover:text-rose-600"
                        title="删除上传记录"
                        aria-label="删除上传记录"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length > 0 && (
              <div className="mt-2 border-t border-zinc-100 pt-2 text-center text-xs text-zinc-400">
                共 {records.length} 条记录
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
