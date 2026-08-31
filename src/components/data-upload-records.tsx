"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface UploadRecord {
  id: number;
  rows_count: number;
  inserted: number;
  skipped: number;
  created_at: string;
}

export function DataUploadRecords() {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/uploads")
      .then((r) => r.json())
      .then((d: UploadRecord[]) => {
        setRecords(d);
      })
      .finally(() => setLoading(false));
  }, []);

  async function deleteRecord(id: number) {
    if (!confirm("确定删除这条上传记录吗？")) return;
    try {
      await fetch(`/api/metrics/uploads?id=${id}`, { method: "DELETE" });
      toast.success("已删除");
      setRecords((r) => r.filter((x) => x.id !== id));
    } catch {
      toast.error("删除失败");
    }
  }

  async function refresh() {
    setLoading(true);
    const d = await fetch("/api/metrics/uploads").then((r) => r.json());
    setRecords(d);
    setLoading(false);
  }

  if (!loading && records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-stone-900">已上传记录</CardTitle>
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
        <CardTitle className="text-base font-semibold text-stone-900">
          <div className="flex items-center justify-between">
            <span>已上传记录</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
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