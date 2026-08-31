"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Trash2, CheckCircle2, Save, Pencil } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PLATFORM_NAME } from "@/lib/constants";

interface Content {
  id: number;
  title: string;
  body: string;
  platform: string;
  role: string;
  status: string;
  scheduled_for: string | null;
  cover_url: string | null;
}

const ROLE: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  case_study: "案例号",
  knowledge: "科普号",
  official: "官方号",
};

export default function ContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [drafts, setDrafts] = useState<{ [id: number]: string }>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ title: string; body: string }>({ title: "", body: "" });

  const load = useCallback(() => {
    fetch("/api/contents").then((r) => r.json()).then((d: Content[]) => setItems(d));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // 按平台分组
  const groups = PLATFORMS.map((p) => ({
    platform: p.id,
    name: p.name,
    items: items.filter((c) => c.platform === p.id),
  })).filter((g) => g.items.length > 0);
  const other = items.filter((c) => !PLATFORM_NAME[c.platform]);
  if (other.length) groups.push({ platform: "other", name: "其他", items: other });

  async function del(c: Content) {
    if (!confirm(`确认删除内容「${c.title}」？`)) return;
    const r = await fetch(`/api/contents/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      load();
    } else toast.error("删除失败");
  }

  async function setSchedule(c: Content) {
    const t = drafts[c.id];
    if (!t) return toast.error("请先选择发布时间");
    const r = await fetch(`/api/contents/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_for: t }),
    });
    if (r.ok) {
      toast.success("已设置发布时间，并同步到内容排期");
      load();
    } else toast.error("设置失败");
  }

  function startEdit(c: Content) {
    setEditing(c.id);
    setEdit({ title: c.title, body: c.body || "" });
  }

  async function saveEdit(c: Content) {
    const r = await fetch(`/api/contents/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: edit.title, body: edit.body }),
    });
    if (r.ok) {
      toast.success("已更新内容");
      setEditing(null);
      load();
    } else toast.error("更新失败");
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#01011b]">内容管理</h2>

      {groups.length === 0 && <p className="text-sm text-[#89828d]">暂无内容，去「新建内容」或「AI 文案工坊」添加吧。</p>}

      {groups.map((g) => (
        <div key={g.platform} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
            <h3 className="text-sm font-semibold text-[#01011b]">{g.name}</h3>
            <span className="text-xs text-[#89828d]">{g.items.length} 篇</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                  <div className="flex items-center justify-between">
                    <Badge>{PLATFORM_NAME[c.platform] ?? c.platform}</Badge>
                    <span className="text-xs text-[#89828d]">{ROLE[c.role] ?? c.role}</span>
                  </div>

                  {editing === c.id ? (
                    <div className="space-y-2">
                      <Input value={edit.title} onChange={(e) => setEdit((p) => ({ ...p, title: e.target.value }))} placeholder="标题" />
                      <Textarea value={edit.body} onChange={(e) => setEdit((p) => ({ ...p, body: e.target.value }))} rows={5} placeholder="正文" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(c)}><Save className="h-3.5 w-3.5" /> 保存</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-[#01011b]">{c.title}</div>
                      <p className="line-clamp-3 text-xs leading-relaxed text-[#717a94]">{c.body}</p>
                    </>
                  )}

                  {c.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt="封面" className="h-24 w-full rounded-lg object-cover" />
                  )}

                  {editing !== c.id && (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-[#89828d]">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {c.scheduled_for ? c.scheduled_for.slice(0, 16).replace("T", " ") : "未排期"}
                        {c.scheduled_for && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <div className="mt-auto flex items-center gap-1.5 pt-1">
                        <input
                          type="datetime-local"
                          value={drafts[c.id] ?? ""}
                          onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                          className="h-8 flex-1 rounded-lg border border-[#e4e0e6] px-2 text-xs focus:outline-none"
                        />
                        <Button size="sm" variant="outline" onClick={() => setSchedule(c)}>排期</Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => del(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </PageFrame>
  );
}
