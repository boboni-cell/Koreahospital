"use client";
import { useEffect, useState } from "react";
import { X, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseMediaUrls, type MediaItem } from "@/lib/media";

export { parseMediaUrls, type MediaItem };

export function MediaGallery({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return <p className="text-xs text-[#89828d]">暂无媒体</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((m, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-[#e4e0e6] bg-[#f6f4f5]">
          {m.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt="" className="h-32 w-full object-cover" />
          ) : (
            <video src={m.url} controls className="h-32 w-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

export function MediaEditor({
  value,
  onChange,
}: {
  value: MediaItem[];
  onChange: (next: MediaItem[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assets, setAssets] = useState<{ id: number; filename: string; file_url: string; file_type: string; category: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pickerOpen) return;
    setLoading(true);
    fetch("/api/assets").then((r) => r.json()).then(setAssets).catch(() => setError("素材库加载失败")).finally(() => setLoading(false));
  }, [pickerOpen]);

  function add(asset: { file_url: string; file_type: string }) {
    if (value.length >= 8) {
      setError("最多 8 个媒体，先删除再添加");
      return;
    }
    if (value.some((item) => item.url === asset.file_url)) return;
    onChange([...value, { type: asset.file_type === "video" ? "video" : "image", url: asset.file_url }]);
    setError("");
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((m, i) => (
            <div key={i} className="group relative overflow-hidden rounded-lg border border-[#e4e0e6] bg-[#f6f4f5]">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-24 w-full object-cover" />
              ) : (
                <video src={m.url} controls className="h-24 w-full object-cover" />
              )}
              <button
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="删除媒体"
                className="absolute right-1 top-1 rounded bg-white/80 p-0.5 text-red-500 opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
        <Images className="h-3.5 w-3.5" /> 从素材库选择
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {pickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setPickerOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="font-semibold">从素材库选择</h3><p className="text-xs text-[#89828d]">点击素材即可关联到当前内容，最多 8 个。</p></div>
              <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            {loading ? <p className="py-10 text-center text-sm text-[#89828d]">加载中…</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {assets.filter((asset) => asset.file_type === "image" || asset.file_type === "video").map((asset) => (
                  <button key={asset.id} type="button" onClick={() => add(asset)} className="overflow-hidden rounded-xl border border-[#e4e0e6] text-left hover:border-[#8c78d8]">
                    {asset.file_type === "video" ? <video src={asset.file_url} className="h-32 w-full bg-black object-contain" /> : <img src={asset.file_url} alt={asset.filename} className="h-32 w-full bg-[#f6f4f5] object-contain" />}
                    <div className="p-2"><p className="truncate text-xs font-medium">{asset.filename}</p><p className="truncate text-[10px] text-[#89828d]">{asset.category || "未分类"}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
