"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, ChevronLeft, ChevronRight, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import {
  DialogRoot,
  DialogContentComp,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Asset {
  id: number;
  filename: string;
  file_url: string | null;
  file_type: string;
  surgery_type: string | null;
  patient_code: string | null;
  license: string;
  usage_count: number;
  file_size?: number | null;
  tags?: string[];
}

function Thumb({
  asset,
  className,
}: {
  asset: Asset;
  className?: string;
}) {
  if (asset.file_url) {
    if (asset.file_type === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.file_url} alt={asset.filename} className={className} />
      );
    }
    if (asset.file_type === "video") {
      return (
        <div className={`relative ${className}`}>
          <video
            src={asset.file_url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="h-10 w-10 text-white drop-shadow" />
          </div>
        </div>
      );
    }
  }
  // 兜底：无真实文件的老素材
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-stone-800/90 to-stone-900/90 text-white ${className}`}
    >
      {asset.file_type === "video" ? (
        <Play className="h-8 w-8" />
      ) : asset.file_type === "image" ? (
        <span className="text-3xl">🖼️</span>
      ) : (
        <FileText className="h-8 w-8" />
      )}
    </div>
  );
}

export function AssetGrid({
  assets,
  onDeleted,
}: {
  assets: Asset[];
  onDeleted?: () => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex != null ? assets[openIndex] : null;

  function go(delta: number) {
    setOpenIndex((i) => {
      if (i == null) return i;
      const n = assets.length;
      return (i + delta + n) % n;
    });
  }

  useEffect(() => {
    if (openIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, assets.length]);

  async function remove(asset: Asset) {
    if (!confirm(`确认删除素材「${asset.filename}」？\n本地文件（及已接入的 R2）将一并删除，不可恢复。`))
      return;
    try {
      const r = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("已删除素材");
      onDeleted?.();
    } catch {
      toast.error("删除失败");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a, i) => (
          <div key={a.id} className="lift surface overflow-hidden rounded-2xl">
            <button
              onClick={() => setOpenIndex(i)}
              className="block w-full text-left"
            >
              <div className="h-32 overflow-hidden">
                <Thumb asset={a} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-medium text-stone-800">
                  {a.filename}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge>{a.license}</Badge>
                  <span className="text-xs text-stone-400">用 {a.usage_count}</span>
                </div>
              </div>
            </button>
            <button
              onClick={() => remove(a)}
              className="flex w-full items-center justify-center gap-1 border-t border-stone-100 py-2 text-xs text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </button>
          </div>
        ))}
      </div>

      {current && (
        <DialogRoot open onOpenChange={(o) => !o && setOpenIndex(null)}>
          <DialogContentComp className="max-w-3xl overflow-hidden p-0">
            <div className="relative flex flex-col">
              <div className="relative flex h-[42vh] items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800 p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={openIndex}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex h-full items-center justify-center"
                  >
                    <Thumb
                      asset={current}
                      className="h-full w-full rounded-lg object-contain"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* 左右翻页 */}
                <button
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40"
                  aria-label="上一个"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40"
                  aria-label="下一个"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <DialogClose>
                  <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40">
                    ✕
                  </button>
                </DialogClose>

                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
                  {(openIndex ?? 0) + 1} / {assets.length}
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="glass flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-stone-800">
                    {current.filename}
                  </span>
                  <Badge>{current.license}</Badge>
                  <span className="text-xs text-stone-400">
                    使用 {current.usage_count} 次
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Field label="类型" value={current.file_type} />
                  <Field label="手术类型" value={current.surgery_type} />
                  <Field label="患者编号" value={current.patient_code} />
                  <Field label="授权" value={current.license} />
                  <Field label="使用次数" value={String(current.usage_count)} />
                  <Field
                    label="大小"
                    value={
                      current.file_size
                        ? `${(current.file_size / 1024).toFixed(0)} KB`
                        : "—"
                    }
                  />
                </div>

                <div className="flex gap-2">
                  {current.file_url ? (
                    <a
                      href={current.file_url}
                      download={current.filename}
                      className="flex-1"
                    >
                      <Button className="w-full bg-stone-900 hover:bg-stone-700">
                        <Download className="h-4 w-4" /> 下载素材
                      </Button>
                    </a>
                  ) : (
                    <Button
                      disabled
                      className="flex-1 bg-stone-200 text-stone-400"
                    >
                      <Download className="h-4 w-4" /> 无文件（旧素材）
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => current && remove(current)}
                  >
                    <Trash2 className="h-4 w-4" /> 删除
                  </Button>
                </div>
              </div>
            </div>
          </DialogContentComp>
        </DialogRoot>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-stone-400">{label}</div>
      <div className="font-medium text-stone-800">{value || "—"}</div>
    </div>
  );
}
