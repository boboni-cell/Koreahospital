"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
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

  const onDrop = useCallback((accepted: File[]) => setFiles(accepted), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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
          {files.length > 0 && (
            <p className="mt-2 text-xs text-zinc-700">已选 {files.length} 个文件</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>素材类别</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "术前案例")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>手术类型</Label>
            <Select value={surgery} onValueChange={(v) => setSurgery(v ?? "FUE")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
