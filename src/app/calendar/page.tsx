"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Sched { id: number; account_id: number | null; slot_time: string; }

export default function CalendarPage() {
  const [items, setItems] = useState<Sched[]>([]);
  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/schedules").then((r) => r.json()).then((d) => setItems(d));
  }

  async function del(id: number) {
    if (!confirm("确认删除这个排期？")) return;
    const r = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除排期");
      load();
    } else toast.error("删除失败");
  }

  // 未来 7 天
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + i);
    return dt;
  });

  function itemsOn(dateStr: string) {
    return items.filter((it) => (it.slot_time || "").slice(0, 10) === dateStr);
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">内容排期</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((dt) => {
          const ds = dt.toISOString().slice(0, 10);
          const list = itemsOn(ds);
          return (
            <Card key={ds} className="h-fit">
              <CardContent className="space-y-2 pt-4">
                <div className="text-sm font-medium text-zinc-800">
                  {dt.getMonth() + 1}/{dt.getDate()}
                  <span className="ml-1 text-xs text-zinc-400">
                    {["日","一","二","三","四","五","六"][dt.getDay()]}
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-zinc-300">—</p>
                ) : (
                  list.map((it) => (
                    <div key={it.id} className="group flex items-center justify-between rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
                      <div>
                        <Badge>账号 {it.account_id}</Badge>
                        <div className="mt-1">{(it.slot_time || "").slice(11, 16)}</div>
                      </div>
                      <button onClick={() => del(it.id)} className="text-red-400 opacity-0 transition group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-400">
        排期来自「日程管理」页添加的条目；可在医院 → 日程管理 中新增。
      </p>
    </PageFrame>
  );
}
