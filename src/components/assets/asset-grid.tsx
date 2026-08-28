"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
  file_type: string;
  surgery_type: string | null;
  patient_code: string | null;
  license: string;
  usage_count: number;
  tags?: string[];
}

export function AssetGrid({ assets }: { assets: Asset[] }) {
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setOpenIndex(i)}
            className="lift surface overflow-hidden rounded-2xl text-left"
          >
            <div className="flex h-32 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-white">
              {a.file_type === "image" ? (
                <span className="text-3xl">🖼️</span>
              ) : (
                <FileText className="h-8 w-8" />
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium text-zinc-800">{a.filename}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge>{a.license}</Badge>
                <span className="text-xs text-zinc-400">用 {a.usage_count}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {current && (
        <DialogRoot open onOpenChange={(o) => !o && setOpenIndex(null)}>
          <DialogContentComp className="max-w-3xl overflow-hidden p-0">
            <div className="relative flex flex-col">
              <div className="relative flex h-[42vh] items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={openIndex}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex h-full items-center justify-center"
                  >
                    {current.file_type === "image" ? (
                      <span className="text-7xl">🖼️</span>
                    ) : (
                      <FileText className="h-20 w-20 text-white" />
                    )}
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
                  <span className="text-sm font-medium text-zinc-800">{current.filename}</span>
                  <Badge>{current.license}</Badge>
                  <span className="text-xs text-zinc-400">使用 {current.usage_count} 次</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Field label="类型" value={current.file_type} />
                  <Field label="手术类型" value={current.surgery_type} />
                  <Field label="患者编号" value={current.patient_code} />
                  <Field label="授权" value={current.license} />
                  <Field label="使用次数" value={String(current.usage_count)} />
                </div>

                <Button className="w-full bg-zinc-900 hover:bg-zinc-700">
                  <Download className="h-4 w-4" /> 下载素材
                </Button>
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
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="font-medium text-zinc-800">{value || "—"}</div>
    </div>
  );
}
