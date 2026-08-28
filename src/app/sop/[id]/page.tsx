"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";

interface Sop {
  id: number;
  title: string;
  category: string;
  content_md: string;
  updated_at: string;
}

const CATS: Record<string, string> = {
  crisis: "合规红线",
  account_ops: "账号运营",
  content: "内容",
  data: "数据",
};

export default function SopDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [doc, setDoc] = useState<Sop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sop/${id}`)
      .then((r) => r.json())
      .then((d) => setDoc(d))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageFrame>
      <Link href="/sop" className="text-sm text-zinc-400 hover:text-zinc-700">
        ← 返回 SOP 中心
      </Link>
      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">加载中…</p>
      ) : doc ? (
        <article className="mx-auto mt-4 max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Badge>{CATS[doc.category] ?? doc.category}</Badge>
            <span className="text-xs text-zinc-400">
              更新于 {doc.updated_at?.slice(0, 10)}
            </span>
          </div>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
            {doc.title}
          </h1>
          <div className="glass rounded-2xl p-6 leading-relaxed text-zinc-700 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:text-zinc-900 [&_table]:w-full [&_td]:border [&_td]:border-zinc-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-200 [&_th]:bg-zinc-50 [&_th]:px-2 [&_th]:py-1">
            <ReactMarkdown>{doc.content_md}</ReactMarkdown>
          </div>
        </article>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">未找到该 SOP。</p>
      )}
    </PageFrame>
  );
}
