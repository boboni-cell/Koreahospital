"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SwitchRoot } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export function ModelConfigForm() {
  const [cfg, setCfg] = useState<AiConfig>({
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    apiKey: "",
    model: "kimi-k3",
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ai-config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (r.ok) toast.success("已保存模型配置");
      else toast.error("保存失败");
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
          模型 API 接入
          {cfg.enabled ? (
            <span className="pill bg-zinc-900 text-white">已启用</span>
          ) : (
            <span className="pill bg-zinc-100 text-zinc-500">未启用</span>
          )}
        </CardTitle>
        <CardDescription>
          配置你自己的模型 Key（任何 OpenAI 兼容端点）。密钥仅保存在本地 data/ai-config.json，不会上传。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-zinc-700">启用 AI 生成</div>
            <div className="text-xs text-zinc-400">关闭时使用内置模板兜底</div>
          </div>
          <SwitchRoot
            checked={cfg.enabled}
            onCheckedChange={(c) => setCfg((p) => ({ ...p, enabled: c }))}
          />
        </div>

        <div className="space-y-1">
          <Label>API Base URL</Label>
          <Input
            value={cfg.baseUrl}
            onChange={(e) => setCfg((p) => ({ ...p, baseUrl: e.target.value }))}
            placeholder="https://api.moonshot.cn/v1/chat/completions"
          />
        </div>

        <div className="space-y-1">
          <Label>API Key</Label>
          <Input
            type="password"
            value={cfg.apiKey}
            onChange={(e) => setCfg((p) => ({ ...p, apiKey: e.target.value }))}
            placeholder="粘贴你的模型 Key"
          />
        </div>

        <div className="space-y-1">
          <Label>模型名</Label>
          <Input
            value={cfg.model}
            onChange={(e) => setCfg((p) => ({ ...p, model: e.target.value }))}
            placeholder="kimi-k3"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "保存中" : "保存配置"}
          </Button>
          {cfg.enabled && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <CheckCircle2 className="h-4 w-4" /> 生成接口将调用你的模型
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
