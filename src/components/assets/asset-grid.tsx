"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText } from "lucide-react";
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
  const [open, setOpen] = useState<Asset | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpen(a)}
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

      {open && (
        <DialogRoot open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContentComp className="max-w-3xl overflow-hidden p-0">
            <div className="relative flex flex-col">
              <div className="flex h-[42vh] items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-6">
                {open.file_type === "image" ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-full items-center justify-center text-7xl"
                  >
                    🖼️
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <FileText className="h-20 w-20 text-white" />
                  </motion.div>
                )}
                <DialogClose>
                  <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40">
                    ✕
                  </button>
                </DialogClose>
              </div>

              <div className="space-y-4 p-5">
                <div className="glass flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-zinc-800">{open.filename}</span>
                  <Badge>{open.license}</Badge>
                  <span className="text-xs text-zinc-400">使用 {open.usage_count} 次</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Field label="类型" value={open.file_type} />
                  <Field label="手术类型" value={open.surgery_type} />
                  <Field label="患者编号" value={open.patient_code} />
                  <Field label="授权" value={open.license} />
                  <Field label="使用次数" value={String(open.usage_count)} />
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
