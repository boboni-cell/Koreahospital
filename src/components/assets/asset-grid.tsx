"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Download, FileText, ChevronLeft, ChevronRight, Trash2, Play, Image as ImageIcon, X } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/constants";
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
  category: string;
  surgery_type: string | null;
  patient_code: string | null;
  license: string;
  usage_count: number;
  file_size?: number | null;
  created_at?: string;
  tags?: string[];
  sensitivity?: string;
  authorization_scope?: string;
  expires_at?: string;
  allowed_platforms?: string;
  ai_editable?: number;
}

function Thumb({ asset, className, controls = false }: { asset: Asset; className?: string; controls?: boolean }) {
  if (asset.file_url) {
    if (asset.file_type === "image") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={asset.file_url} alt={asset.filename} className={className} />;
    }
    if (asset.file_type === "video") {
      return (
        <div className={`relative ${className}`}>
          <video
            src={asset.file_url}
            muted={!controls}
            playsInline
            controls={controls}
            preload="metadata"
            className="h-full w-full object-cover"
          />
          {!controls && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="h-10 w-10 text-white drop-shadow" />
            </div>
          )}
        </div>
      );
    }
  }
  return (
    <div className={`flex items-center justify-center bg-[#262321] text-[#d7d0c9] ${className}`}>
      {asset.file_type === "video" ? <Play className="h-8 w-8" /> : asset.file_type === "image" ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
    </div>
  );
}

function dateLabel(d?: string): string {
  if (!d) return "未知时间";
  const date = d.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) return "今天";
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === yest) return "昨天";
  return date;
}

function licenseLabel(value: string) {
  return value === "authorized" ? "已授权" : value === "expired" ? "已过期" : "待授权";
}

export function AssetGrid({ assets, onDeleted }: { assets: Asset[]; onDeleted?: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [flatAssets, setFlatAssets] = useState<Asset[]>([]);

  // 先按类别分，再按日期分：类别组 -> 组内按日期排序（今日/昨天/具体日）
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, Asset[]>>();
    for (const a of assets) {
      const cat = a.category || "未分类";
      if (!map.has(cat)) map.set(cat, new Map());
      const dmap = map.get(cat)!;
      const day = dateLabel(a.created_at);
      if (!dmap.has(day)) dmap.set(day, []);
      dmap.get(day)!.push(a);
    }
    // 类别排序：有定义类别的按常量顺序，未分类置底
    const order = ["术前案例", "术后案例", "科普图示", "手术环境", "授权文件", "宣传物料", "未分类"];
    const cats = [...map.keys()].sort((a, b) => {
      const ia = order.indexOf(a); const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return cats.map((cat) => {
      const dmap = map.get(cat)!;
      const days = [...dmap.keys()].sort((a, b) => {
        const rank = (d: string) => (d === "今天" ? 0 : d === "昨天" ? 1 : 2);
        const ra = rank(a), rb = rank(b);
        if (ra !== rb) return ra - rb;
        // 组内倒序（新在上）：用具体日期字符串比较，今天/昨天按原样
        return (a === "今天" || a === "昨天") ? 0 : b.localeCompare(a);
      });
      return { cat, days: days.map((day) => ({ day, items: dmap.get(day)! })) };
    });
  }, [assets]);

  // 展开逻辑：点击当前卡时，flatAssets 按 groups 顺序
  useEffect(() => {
    setFlatAssets(groups.flatMap((g) => g.days.flatMap((d) => d.items)));
  }, [groups]);

  const current = openIndex != null ? flatAssets[openIndex] : null;

  function go(delta: number) {
    setOpenIndex((i) => {
      if (i == null) return i;
      const n = flatAssets.length;
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
  }, [openIndex, flatAssets.length]);

  async function updateGate(a: Asset, patch: Partial<Asset>) {
    try {
      await fetch("/api/assets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, ...patch }) });
      toast.success("已更新素材分级/授权");
      onDeleted?.();
    } catch {
      toast.error("更新失败");
    }
  }

  async function remove(asset: Asset) {
    if (!confirm(`确认删除素材「${asset.filename}」？\n本地文件（及已接入的 R2）将一并删除，不可恢复。`)) return;
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
      {groups.length === 0 && (
        <p className="mt-6 text-sm text-[#89828d]">暂无素材，去批量上传登记吧。</p>
      )}

      {groups.map((g) => (
        <div key={g.cat} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
            <h3 className="text-sm font-semibold text-[#01011b]">{g.cat}</h3>
            <span className="text-xs text-[#89828d]">{g.days.reduce((n, d) => n + d.items.length, 0)} 个</span>
          </div>
          {g.days.map((d) => (
            <div key={g.cat + d.day} className="mb-4">
              <div className="mb-2 text-[11px] text-[#89828d]">{d.day}</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {d.items.map((a) => {
                  const idx = flatAssets.findIndex((x) => x.id === a.id);
                  return (
                    <div key={a.id} className="lift surface overflow-hidden rounded-2xl">
                      <button onClick={() => setOpenIndex(idx)} className="block w-full text-left">
                        <div className="h-32 overflow-hidden">
                          <Thumb asset={a} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-3">
                          <div className="truncate text-sm font-medium text-[#01011b]">{a.filename}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge className={a.sensitivity === "sensitive" ? "bg-rose-50 text-rose-600" : "bg-[#ecedf2] text-[#717a94]"}>{a.sensitivity === "sensitive" ? "敏感" : "普通"}</Badge>
                            <Badge>{licenseLabel(a.license)}</Badge>
                            <span className="text-xs text-[#89828d]">用 {a.usage_count}</span>
                          </div>
                        </div>
                      </button>
                      <button onClick={() => remove(a)} className="flex w-full items-center justify-center gap-1 border-t border-[#ecedf2] py-2 text-xs text-red-500 transition hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {current && (
        <DialogRoot open onOpenChange={(o) => !o && setOpenIndex(null)}>
          <DialogContentComp className="max-w-3xl overflow-hidden p-0">
            <div className="relative flex flex-col">
              <div className="relative flex h-[42vh] items-center justify-center bg-[#1f1d1b] p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={openIndex}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex h-full items-center justify-center"
                  >
                    <Thumb asset={current} controls className="h-full w-full rounded-lg object-contain" />
                  </motion.div>
                </AnimatePresence>

                <button onClick={() => go(-1)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40" aria-label="上一个">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => go(1)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40" aria-label="下一个">
                  <ChevronRight className="h-5 w-5" />
                </button>

                <DialogClose>
                  <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40" aria-label="关闭"><X className="h-4 w-4" /></button>
                </DialogClose>

                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
                  {(openIndex ?? 0) + 1} / {flatAssets.length}
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="glass flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-[#01011b]">{current.filename}</span>
                  <Badge>{licenseLabel(current.license)}</Badge>
                  <Badge>{current.category}</Badge>
                  <span className="text-xs text-[#89828d]">使用 {current.usage_count} 次</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Field label="类型" value={current.file_type} />
                  <Field label="类别" value={current.category} />
                  <Field label="手术类型" value={current.surgery_type} />
                  <Field label="患者编号" value={current.patient_code} />
                  <Field label="授权" value={licenseLabel(current.license)} />
                  <Field label="大小" value={current.file_size ? `${(current.file_size / 1024).toFixed(0)} KB` : "—"} />
                </div>

                <div className={"rounded-xl px-3 py-2 text-xs " + (current.sensitivity === "sensitive" && current.license !== "authorized" ? "bg-rose-50 text-rose-600" : "bg-[#f6f4f5] text-[#43394c]")}>
                  {current.sensitivity === "sensitive" && current.license !== "authorized"
                    ? <span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />敏感医疗素材且未授权，禁止进入待发布；请补授权或改用普通素材。</span>
                    : current.sensitivity === "sensitive"
                    ? "已授权敏感素材：可用于授权平台的发布。"
                    : "普通素材：可直接用于发布。"}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateGate(current, { sensitivity: current.sensitivity === "sensitive" ? "normal" : "sensitive" })}>
                    {current.sensitivity === "sensitive" ? "标记为普通" : "标记为敏感"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateGate(current, { license: current.license === "authorized" ? "pending" : current.license === "expired" ? "authorized" : "authorized" })}>
                    授权状态：{licenseLabel(current.license)}
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#89828d]">分类</span>
                    <Select value={current.category || "未分类"} onValueChange={(v) => v && updateGate(current, { category: v })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["未分类", ...ASSET_CATEGORY_OPTIONS].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  {current.file_url ? (
                    <a href={current.file_url} download={current.filename} className="flex-1">
                      <Button className="w-full bg-[#01011b] hover:bg-stone-700"><Download className="h-4 w-4" /> 下载素材</Button>
                    </a>
                  ) : (
                    <Button disabled className="flex-1 bg-[#ecedf2] text-[#89828d]"><Download className="h-4 w-4" /> 无文件（旧素材）</Button>
                  )}
                  <Button variant="destructive" onClick={() => current && remove(current)}><Trash2 className="h-4 w-4" /> 删除</Button>
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
      <div className="text-xs text-[#89828d]">{label}</div>
      <div className="font-medium text-[#01011b]">{value || "—"}</div>
    </div>
  );
}
