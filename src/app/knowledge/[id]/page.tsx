"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaEditor, MediaGallery, parseMediaUrls, type MediaItem } from "@/components/media-gallery";

interface Item {
  id: number;
  kind: string;
  platform: string | null;
  title: string;
  content: string | null;
  evidence: string | null;
  media_urls: string | null;
  status: string;
  created_at: string;
}

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [item, setItem] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [evidence, setEvidence] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await params;
      if (cancelled) return;
      setId(p.id);
      const r = await fetch(`/api/knowledge/${p.id}`).then((x) => x.json());
      if (cancelled || r.error) return;
      setItem(r);
      setTitle(r.title ?? "");
      setContent(r.content ?? "");
      setEvidence(r.evidence ?? "");
      setMedia(parseMediaUrls(r.media_urls));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [params]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, evidence, media_urls: media }),
      });
      if (!r.ok) throw new Error();
      toast.success("已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("确认删除此知识条目？")) return;
    const r = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      window.location.href = "/knowledge";
    } else toast.error("删除失败");
  }

  if (loading) {
    return (
      <PageFrame>
        <p className="py-12 text-center text-sm text-[#89828d]">加载中…</p>
      </PageFrame>
    );
  }
  if (!item) {
    return (
      <PageFrame>
        <Link href="/knowledge" className="inline-flex items-center gap-1 text-sm text-[#89828d] hover:text-[#01011b]">
          <ArrowLeft className="h-4 w-4" /> 返回知识库
        </Link>
        <p className="mt-8 text-center text-sm text-red-500">未找到该条目</p>
      </PageFrame>
    );
  }

  const KIND_LABEL: Record<string, string> = {
    competitor: "竞品档案",
    structure: "爆款结构库",
    cta: "CTA 库",
    comment: "评论引导库",
  };

  return (
    <PageFrame>
      <Link href="/knowledge" className="mb-4 inline-flex items-center gap-1 text-xs text-[#89828d] hover:text-[#01011b]">
        <ArrowLeft className="h-3.5 w-3.5" /> 返回知识库
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge>{KIND_LABEL[item.kind] ?? item.kind}</Badge>
          <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">{item.title}</h2>
          <span className="text-[11px] text-[#89828d]">{item.created_at?.slice(0, 10)}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "保存中" : "保存修改"}
          </Button>
          <Button variant="outline" onClick={remove} className="text-red-500">
            <Trash2 className="h-4 w-4" /> 删除
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <label className="text-xs text-[#675f58]">标题</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#675f58]">内容</label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#675f58]">来源 / 证据</label>
                <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="例如：某竞品账号主页截图" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold text-[#01011b]">媒体（图片 / 视频）</h3>
              <MediaEditor value={media} onChange={setMedia} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-2 text-sm font-semibold text-[#01011b]">预览</h3>
              <MediaGallery items={media} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}