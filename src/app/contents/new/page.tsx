"use client";

import { useState } from "react";
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

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [role, setRole] = useState("director");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, platform, role, status: "draft" }),
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
            <Label>正文</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "保存中" : "保存草稿"}</Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
