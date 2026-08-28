"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  useEffect(() => {
    fetch("/api/sop").then((r) => r.json()).then((d) => setDocs(d));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">SOP 中心</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <Link key={d.id} href={`/sop/${d.id}`} className="lift surface block rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <Badge>{CATS[d.category] ?? d.category}</Badge>
              {d.is_required ? <span className="pill bg-zinc-900 text-white">必读</span> : null}
            </div>
            <div className="mt-2 font-medium text-zinc-800">{d.title}</div>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}
