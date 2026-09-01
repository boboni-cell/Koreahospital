"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2, X, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaEditor, MediaGallery, parseMediaUrls, type MediaItem } from "@/components/media-gallery";
import { PLATFORM_NAME } from "@/lib/constants";

export interface ContentDetail {
  id: number;
  title: string;
  body: string | null;
  platform: string | null;
  role: string | null;
  status: string;
  cover_url: string | null;
  media_urls: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  data_filled: number | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  scheduled: "已排期",
  published: "已发布",
  archived: "已归档",
};

export function ContentDetailDialog({
  contentId,
  open,
  onClose,
  onChanged,
}: {
  contentId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<ContentDetail | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open || !contentId) return;
    setLoading(true);
    fetch(`/api/contents/${contentId}`).then((r) => r.json()).then((d) => {
      if (d.error) {
        toast.error("加载失败");
        onClose();
        return;
      }
      setData(d);
      setMedia(parseMediaUrls(d.media_urls));
    }).catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }, [open, contentId, onClose]);

  if (!open) return null;

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/contents/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_urls: media }),
      });
      if (!r.ok) throw new Error();
      toast.success("已保存");
      onChanged?.();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!data) return;
    if (!confirm(`确认删除内容「${data.title}」？关联排期也会一并删除。`)) return;
    setRemoving(true);
    try {
      const r = await fetch(`/api/contents/${data.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("已删除");
      onChanged?.();
      onClose();
    } catch {
      toast.error("删除失败");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ecedf2] bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            {data && (
              <>
                <Badge className={data.status === "published" ? "bg-emerald-100 text-emerald-600" : data.status === "scheduled" ? "bg-amber-100 text-amber-600" : "bg-[#ecedf2] text-[#717a94]"}>
                  {STATUS_LABEL[data.status] ?? data.status}
                </Badge>
                <Badge>{PLATFORM_NAME[data.platform ?? ""] ?? data.platform ?? "未指定"}</Badge>
                <h3 className="text-base font-semibold text-[#01011b]">{data.title}</h3>
              </>
            )}
          </div>
          <button onClick={onClose} aria-label="关闭" className="rounded p-1 hover:bg-[#f4eeea]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#89828d]" />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#89828d]">正文</h4>
              <p className="whitespace-pre-wrap rounded-lg bg-[#f6f4f5] p-3 text-sm leading-relaxed text-[#31263b]">
                {data.body || <span className="text-[#a9a4ad]">（正文为空）</span>}
              </p>
            </section>

            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#89828d]">封面</h4>
              {data.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.cover_url} alt="封面" className="max-h-48 w-full rounded-lg object-cover" />
              ) : (
                <p className="text-xs text-[#a9a4ad]">无封面</p>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#89828d]">
                  <ImageIcon className="h-3.5 w-3.5" /> 图片 / <Video className="h-3.5 w-3.5" /> 视频
                </h4>
                <span className="text-[11px] text-[#89828d]">{media.length} 个</span>
              </div>
              <MediaEditor value={media} onChange={setMedia} />
              {media.length > 0 && (
                <div className="mt-3">
                  <MediaGallery items={media} />
                </div>
              )}
            </section>

            <section className="grid grid-cols-2 gap-3 text-xs text-[#675f58] sm:grid-cols-4">
              <Field label="角色" value={data.role} />
              <Field label="排期" value={data.scheduled_for?.slice(0, 16).replace("T", " ")} />
              <Field label="发布时间" value={data.published_at?.slice(0, 16).replace("T", " ")} />
              <Field label="数据已回填" value={data.data_filled ? "是" : "否"} />
            </section>
          </div>
        )}

        {data && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[#ecedf2] bg-white px-5 py-3">
            <Button variant="outline" onClick={remove} disabled={removing} className="text-red-500">
              <Trash2 className="h-4 w-4" /> {removing ? "删除中" : "删除内容"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>关闭</Button>
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "保存中" : "保存媒体"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#89828d]">{label}</div>
      <div className="font-medium text-[#01011b]">{value || "—"}</div>
    </div>
  );
}