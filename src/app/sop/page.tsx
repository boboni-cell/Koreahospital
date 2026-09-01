"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Sop {
  id: number;
  title: string;
  category: string;
  is_required: number;
}

const CATS: Record<string, string> = {
  crisis: "合规红线",
  account_ops: "账号运营",
  content: "内容",
  data: "数据",
};

export default function SopPage() {
  const [docs, setDocs] = useState<Sop[]>([]);
  async function load() {
    const d = await fetch("/api/sop").then((r) => r.json());
    setDocs(d);
  }
  useEffect(() => { load(); }, []);

  async function del(id: number, title: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确认删除 SOP「${title}」？`)) return;
    const r = await fetch(`/api/sop/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      load();
    } else toast.error("删除失败");
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">SOP 中心</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <div key={d.id} className="lift surface relative block rounded-2xl p-4">
            <Link href={`/sop/${d.id}`} className="block">
              <div className="flex items-center justify-between">
                <Badge>{CATS[d.category] ?? d.category}</Badge>
                {d.is_required ? <span className="pill bg-zinc-900 text-white">必读</span> : null}
              </div>
              <div className="mt-2 font-medium text-zinc-800">{d.title}</div>
            </Link>
            <button
              onClick={(e) => del(d.id, d.title, e)}
              aria-label="删除"
              className="absolute right-2 top-2 flex items-center gap-1 rounded p-1 text-xs text-red-400 opacity-60 hover:opacity-100 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
