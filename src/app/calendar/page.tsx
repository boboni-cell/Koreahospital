"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ChevronRight, Download, LayoutGrid, CalendarDays } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/constants";

interface Sched { id: number; account_id: number | null; slot_time: string; content_id: number | null; }
interface Content { id: number; title: string; status: string; platform: string; }

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function fmt(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseDate(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }

export default function CalendarPage() {
  const [items, setItems] = useState<Sched[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [view, setView] = useState<"week" | "month">("week");
  // anchor 日期（yyyy-mm-dd）；周视图锚点=周内任一天，月视图锚点=当月任一天
  const [anchor, setAnchor] = useState<string>(fmt(new Date()));

  useEffect(() => { load(); }, []);

  function load() {
    Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/contents").then((r) => r.json()),
    ]).then(([s, c]) => { setItems(s); setContents(c); });
  }

  async function del(id: number) {
    if (!confirm("确认删除这个排期？")) return;
    const r = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("已删除排期"); load(); } else toast.error("删除失败");
  }

  const anchorDate = parseDate(anchor);

  // 视野范围：周=锚点所在周(周日-周六)，月=锚点所在月(整月网格)
  const viewDates = useMemo(() => {
    if (view === "week") {
      const start = new Date(anchorDate);
      start.setDate(start.getDate() - start.getDay()); // 周日
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    }
    const y = anchorDate.getFullYear(), m = anchorDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // 月初对齐周日
    const last = new Date(y, m + 1, 0);
    const cells = Math.ceil(((last.getDate() + first.getDay()) / 7)) * 7;
    return Array.from({ length: cells }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [anchor, view, anchorDate]);

  function itemsOn(dateStr: string) {
    return items.filter((it) => (it.slot_time || "").slice(0, 10) === dateStr);
  }

  function shift(delta: number) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + (view === "week" ? delta * 7 : delta * 30));
    setAnchor(fmt(d));
  }

  function exportCsv() {
    const s = viewDates[0];
    const e = viewDates[viewDates.length - 1];
    const range = `${fmt(s)} ~ ${fmt(e)}`;
    const head = "日期,时间,平台,标题,状态\n";
    const rows = items
      .map((it) => {
        const c = contents.find((x) => x.id === it.content_id);
        return `${(it.slot_time || "").slice(0, 10)},${(it.slot_time || "").slice(11, 16)},${PLATFORM_NAME[c?.platform ?? ""] ?? ""},"${String(c?.title ?? "未关联内容").replace(/"/g, '""')}",${c?.status === "published" ? "已发布" : "待发布"}`;
      })
      .filter((r) => r.startsWith(fmt(s)))
      .join("\n");
    const csv = "\ufeff" + range + "\n" + head + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `排期_${view}_${fmt(s)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出${view === "week" ? "周" : "月"}排期 CSV`);
  }

  const todayStr = fmt(new Date());
  const rangeLabel = view === "week"
    ? `${viewDates[0].getMonth() + 1}/${viewDates[0].getDate()} – ${viewDates[viewDates.length - 1].getMonth() + 1}/${viewDates[viewDates.length - 1].getDate()}`
    : `${anchorDate.getFullYear()}年${anchorDate.getMonth() + 1}月`;

  return (
    <PageFrame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">内容排期</h2>
          <span className="text-sm text-zinc-400">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-stone-200">
            <button onClick={() => setView("week")} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${view === "week" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> 周
            </button>
            <button onClick={() => setView("month")} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs ${view === "month" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}>
              <CalendarDays className="h-3.5 w-3.5" /> 月
            </button>
          </div>
          <button onClick={() => shift(-1)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setAnchor(fmt(new Date()))} className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50">今天</button>
          <button onClick={() => shift(1)} className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"><ChevronRight className="h-4 w-4" /></button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> 导出{view === "week" ? "周" : "月"}</Button>
        </div>
      </div>

      <div className={`grid gap-2 ${view === "week" ? "grid-cols-7" : "grid-cols-7"}`}>
        {WEEK.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-zinc-400">{w}</div>
        ))}
        {viewDates.map((dt) => {
          const ds = fmt(dt);
          const list = itemsOn(ds);
          const inMonth = dt.getMonth() === anchorDate.getMonth();
          const isToday = ds === todayStr;
          return (
            <div key={ds} className={`min-h-[96px] rounded-xl border p-1.5 transition ${isToday ? "border-rose-300 bg-rose-50/40" : "border-stone-100"} ${!inMonth && view === "month" ? "opacity-40" : ""}`}>
              <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-rose-500" : "text-zinc-400"}`}>{dt.getDate()}</div>
              <div className="space-y-1">
                {list.map((it) => {
                  const c = contents.find((x) => x.id === it.content_id);
                  const published = c?.status === "published";
                  return (
                    <div key={it.id} className="group rounded-md bg-stone-50 p-1 text-[10px] leading-tight">
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-[9px] text-zinc-400">{(it.slot_time || "").slice(11, 16)}</span>
                        <span className="text-[9px] text-zinc-300">{PLATFORM_NAME[c?.platform ?? ""] ?? ""}</span>
                        <button onClick={() => del(it.id)} className="ml-auto hidden text-red-400 group-hover:block"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                      <div className="mt-0.5 truncate text-zinc-600">{c?.title || "（未关联内容）"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> 已发布</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> 待发布</span>
        <span className="ml-auto">排期来自：内容管理设发布时间 / 日程管理添加；发布后自动回写</span>
      </div>
    </PageFrame>
  );
}
