"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PLATFORMS } from "@/lib/constants";

interface Asset {
  id: number;
  filename: string;
  file_url: string | null;
  file_type: string;
  category: string;
}

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [role, setRole] = useState("director");
  const [coverUrl, setCoverUrl] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/assets").then((r) => r.json()).then((d) => setAssets(d || []));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          platform,
          role,
          status: "draft",
          cover_url: coverUrl || null,
        }),
      });
      toast.success("已保存草稿");
      router.push("/contents");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">新建内容</h2>
      <Card className="max-w-2xl">
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>平台</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>角色</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? "director")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["director","consultant","official","case_study","knowledge","viral"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>封面素材（可选，可去「素材库」查看）</Label>
            <Select value={coverUrl || "_none"} onValueChange={(v) => setCoverUrl(v === "_none" ? "" : (v ?? ""))}>
              <SelectTrigger><SelectValue>{coverUrl ? assets.find((a) => a.file_url === coverUrl)?.filename ?? "已选素材" : "不选"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">不选</SelectItem>
                {assets.filter((a) => a.file_url).map((a) => (
                  <SelectItem key={a.id} value={a.file_url!}>
                    {a.file_type === "video" ? "🎬" : "🖼"} {a.filename} · {a.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="封面预览" className="mt-2 h-32 w-full rounded-lg object-cover" />
            )}
          </div>
          <div className="space-y-1">
            <Label>正文</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "保存中" : "保存草稿"}</Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
