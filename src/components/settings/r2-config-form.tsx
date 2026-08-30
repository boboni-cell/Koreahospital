"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, CheckCircle2, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface R2Config {
  configured: boolean;
  bucket: string;
  publicBase: string;
  endpoint: string;
  region: string;
  accessKeyIdSet: boolean;
  secretAccessKeySet: boolean;
}

export function R2ConfigForm() {
  const [cfg, setCfg] = useState<R2Config | null>(null);
  const [form, setForm] = useState({
    bucket: "",
    publicBase: "",
    endpoint: "",
    region: "auto",
    accessKeyId: "",
    secretAccessKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/r2-config")
      .then((r) => r.json())
      .then((d: R2Config) => {
        setCfg(d);
        setForm({
          bucket: d.bucket || "",
          publicBase: d.publicBase || "",
          endpoint: d.endpoint || "",
          region: d.region || "auto",
          accessKeyId: "",
          secretAccessKey: "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/r2-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        toast.success("已保存 R2 配置（删除/上传将同步到 R2）");
        setCfg((p) => ({ ...p, configured: true, ...form, accessKeyIdSet: true, secretAccessKeySet: true }));
      } else toast.error("保存失败");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
      </div>
    );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" /> Cloudflare R2 素材存储
          {cfg?.configured ? (
            <span className="pill bg-zinc-900 text-white">已连接</span>
          ) : (
            <span className="pill bg-zinc-100 text-zinc-500">未连接</span>
          )}
        </CardTitle>
        <CardDescription>
          连接后，上传的素材会同步到 R2（通过 wrangler CLI），删除时本地与 R2 一并清理。
          填一次即可，密钥只存在本地 data/r2-config.json（已 gitignore）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Bucket 名称</Label>
            <Input
              value={form.bucket}
              onChange={(e) => setForm((p) => ({ ...p, bucket: e.target.value }))}
              placeholder="my-clinic-assets"
            />
          </div>
          <div className="space-y-1">
            <Label>公开访问域名（可选）</Label>
            <Input
              value={form.publicBase}
              onChange={(e) => setForm((p) => ({ ...p, publicBase: e.target.value }))}
              placeholder="https://cdn.example.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>R2 Endpoint</Label>
            <Input
              value={form.endpoint}
              onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
              placeholder="https://<id>.r2.cloudflarestorage.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Region</Label>
            <Input
              value={form.region}
              onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
              placeholder="auto"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Access Key ID{cfg?.accessKeyIdSet ? "（已配置，留空不改）" : ""}</Label>
            <Input
              type="password"
              value={form.accessKeyId}
              onChange={(e) => setForm((p) => ({ ...p, accessKeyId: e.target.value }))}
              placeholder="填写 R2 API Token 的 access key"
            />
          </div>
          <div className="space-y-1">
            <Label>Secret Access Key{cfg?.secretAccessKeySet ? "（已配置，留空不改）" : ""}</Label>
            <Input
              type="password"
              value={form.secretAccessKey}
              onChange={(e) => setForm((p) => ({ ...p, secretAccessKey: e.target.value }))}
              placeholder="填写 R2 API Token 的 secret"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "保存中" : "保存 R2 配置"}
          </Button>
          {cfg?.configured && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <CheckCircle2 className="h-4 w-4" /> 删除/上传已启用 R2 同步
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
