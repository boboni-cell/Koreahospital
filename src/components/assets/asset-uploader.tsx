"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FileText, Play, UploadCloud, X } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SURGERY_TYPE_OPTIONS, ASSET_CATEGORY_OPTIONS } from "@/lib/constants";

export function AssetUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [surgery, setSurgery] = useState("FUE");
  const [category, setCategory] = useState("术前案例");
  const [patientCode, setPatientCode] = useState("");
  const [license, setLicense] = useState("pending");
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string | null }[]>([]);

  const onDrop = useCallback((accepted: File[]) => setFiles(accepted), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "video/*": [], "application/pdf": [] },
  });

  useEffect(() => {
    const next = files.map((file) => ({
      file,
      url: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null,
    }));
    setPreviews(next);
    return () => next.forEach((item) => item.url && URL.revokeObjectURL(item.url));
  }, [files]);

  function removeFile(name: string, lastModified: number) {
    setFiles((current) => current.filter((file) => file.name !== name || file.lastModified !== lastModified));
  }

  async function upload() {
    if (!files.length) return toast.error("请选择文件");
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("surgery_type", surgery);
        fd.append("category", category);
        fd.append("patient_code", patientCode);
        fd.append("license", license);
        const r = await fetch("/api/assets/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error("上传失败");
      }
      toast.success(`已上传 ${files.length} 个素材`);
      setFiles([]);
      router.push("/assets");
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="space-y-4 pt-4">
        <div
          {...getRootProps()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 py-10 text-center transition hover:border-zinc-400"
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-500">
            {isDragActive ? "放开以上传" : "拖拽图片 / 视频 / 文档到此处，或点击选择"}
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            {files.length > 0 ? `已选 ${files.length} 个文件，可在下方确认预览` : "未接入 R2 时会保存为本地占位素材"}
          </p>
        </div>

        {previews.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="待上传素材预览">
            {previews.map(({ file, url }) => (
              <div key={`${file.name}-${file.lastModified}`} className="overflow-hidden rounded-[16px] border border-[#e3ddd6] bg-[#f7f3ee]">
                <div className="relative h-32 overflow-hidden bg-[#ebe6df]">
                  {file.type.startsWith("image/") && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={file.name} className="h-full w-full object-cover" />
                  ) : file.type.startsWith("video/") && url ? (
                    <div className="relative h-full w-full">
                      <video src={url} muted playsInline className="h-full w-full object-cover" />
                      <Play className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" />
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center text-[#827a73]"><FileText className="h-8 w-8" /></div>
                  )}
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); removeFile(file.name, file.lastModified); }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#171619]/80 text-white backdrop-blur"
                    aria-label={`移除 ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="px-3 py-2">
                  <p className="truncate text-xs font-semibold text-[#2d2926]">{file.name}</p>
                  <p className="mt-0.5 text-[10px] text-[#918981]">{(file.size / 1024 / 1024).toFixed(2)} MB · 等待登记</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>素材类别</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "术前案例")}>
              <SelectTrigger><SelectValue>{category}</SelectValue></SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>手术类型</Label>
            <Select value={surgery} onValueChange={(v) => setSurgery(v ?? "FUE")}>
              <SelectTrigger><SelectValue>{surgery}</SelectValue></SelectTrigger>
              <SelectContent>
                {SURGERY_TYPE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>患者编号</Label>
            <Input value={patientCode} onChange={(e) => setPatientCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>授权状态</Label>
            <Select value={license} onValueChange={(v) => setLicense(v ?? "pending")}>
              <SelectTrigger><SelectValue>{license === "authorized" ? "已授权" : license === "expired" ? "已过期" : "待授权"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待授权</SelectItem>
                <SelectItem value="authorized">已授权</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={upload} disabled={uploading} className="bg-zinc-900 hover:bg-zinc-700">
          {uploading ? "上传中" : "登记素材"}
        </Button>
      </CardContent>
    </Card>
  );
}
