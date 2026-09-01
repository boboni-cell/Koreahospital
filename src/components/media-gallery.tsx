"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
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
  const [draftUrl, setDraftUrl] = useState("");
  const [draftType, setDraftType] = useState<"image" | "video">("image");
  const [error, setError] = useState("");

  function add() {
    setError("");
    const url = draftUrl.trim();
    if (!url) {
      setError("请粘贴一个图片或视频的 URL");
      return;
    }
    if (value.length >= 8) {
      setError("最多 8 个媒体，先删除再添加");
      return;
    }
    onChange([...value, { type: draftType, url }]);
    setDraftUrl("");
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
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={draftType}
          onChange={(e) => setDraftType(e.target.value as "image" | "video")}
          className="rounded-lg border border-[#e4e0e6] bg-white px-2 py-1.5 text-sm"
        >
          <option value="image">图片</option>
          <option value="video">视频</option>
        </select>
        <input
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="粘贴 URL（素材库点右键复制链接）"
          className="min-w-0 flex-1 rounded-lg border border-[#e4e0e6] bg-white px-3 py-1.5 text-sm focus:outline-none"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> 添加
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[11px] text-[#89828d]">
        提示：上传到「素材库」后右键图片 → 复制图片地址，再粘贴到这里。
      </p>
    </div>
  );
}