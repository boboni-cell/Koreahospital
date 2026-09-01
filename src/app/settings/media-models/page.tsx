"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, FlaskConical, Eye, EyeOff, Image as ImageIcon, Film } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type MediaKind = "image" | "video";
type ProviderId = "mock" | "openai" | "deepseek" | "kimi" | "volcengine" | "doubao" | "qwen" | "zhipu" | "hunyuan" | "dashscope" | "siliconflow" | "moyu" | "agnes" | "atlascloud" | "fal" | "openrouter" | "minimax" | "minimax-cn" | "nanogpt" | "custom";

interface ProviderInfo { id: ProviderId; label: string; desc: string; imageStyle: string; videoStyle: string; image: string; video: string; defaultModel: string; domestic: boolean; }
interface MediaModel {
  id: number;
  kind: MediaKind;
  provider: ProviderId;
  base_url: string;
  api_key_set: boolean;
  model: string;
  is_mock: number;
  last_tested_at: string | null;
  last_test_status: number | null;
  last_test_error: string | null;
}

export default function MediaModelsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [list, setList] = useState<MediaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, {
    provider: ProviderId;
    baseUrl: string;
    apiKey: string;
    model: string;
    showKey: boolean;
    saving: boolean; testing: boolean;
  }>>({});

  async function load() {
    const r = await fetch("/api/media-models").then((x) => x.json());
    setProviders(r.providers || []);
    const rows: MediaModel[] = r.models || [];
    setList(rows);
    const next: typeof edits = { ...edits };
    for (const m of rows) {
      next[m.kind] = next[m.kind] || {
        provider: m.provider, baseUrl: m.base_url, apiKey: "", model: m.model,
        showKey: false, saving: false, testing: false,
      };
      next[m.kind].provider = m.provider;
      next[m.kind].baseUrl = m.base_url;
      next[m.kind].model = m.model;
    }
    setEdits(next);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function setEdit(kind: string, patch: Partial<NonNullable<typeof edits[string]>>) {
    setEdits((p) => ({ ...p, [kind]: { ...p[kind], ...patch } }));
  }

  async function save(kind: MediaKind) {
      const e = edits[kind];
      if (!e) return;
      const cur = list.find((x) => x.kind === kind);
      setEdit(kind, { saving: true });
      try {
        // 同 agent-models 页：仅在用户主动碰过 apiKey 时才带上字段，避免误清空 DB key
        const apiKeyTouched = e.apiKey.length > 0;
        const body: Record<string, unknown> = {
          kind,
          provider: e.provider,
          baseUrl: e.baseUrl,
          model: e.model,
        };
        if (apiKeyTouched || (cur && !cur.api_key_set)) body.apiKey = e.apiKey;
        const res = await fetch(`/api/media-models/${kind}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success(`${kind === "image" ? "图像" : "视频"}模型已保存`);
        setEdit(kind, { apiKey: "" });
        await load();
      } catch (err) {
        toast.error(`保存失败：${(err as Error).message}`);
      } finally {
        setEdit(kind, { saving: false });
      }
    }

  async function test(kind: MediaKind) {
    setEdit(kind, { testing: true });
    try {
      const res = await fetch(`/api/media-models/${kind}/test`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const j = await res.json();
      if (j.ok) toast.success(`${kind} 测试通过（endpoint: ${j.endpoint}）`);
      else toast.error(`${kind} 测试失败：${j.error || `HTTP ${j.status}`}`);
      await load();
    } finally {
      setEdit(kind, { testing: false });
    }
  }

  function onPickProvider(kind: MediaKind, p: ProviderId) {
    const tpl = providers.find((x) => x.id === p);
    setEdit(kind, {
      provider: p,
      baseUrl: p === "custom" ? edits[kind]?.baseUrl || "" : (tpl?.image || tpl?.video || ""),
      model: tpl?.defaultModel || edits[kind]?.model || "",
    });
  }

  if (loading) {
    return (
      <PageFrame>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />加载中…</div>
      </PageFrame>
    );
  }

  function renderCard(kind: MediaKind, label: string, desc: string, Icon: React.ComponentType<{className?:string}>) {
    const m = list.find((x) => x.kind === kind);
    const e = edits[kind];
    if (!m || !e) return null;
    const tpl = providers.find((p) => p.id === e.provider);
    const style = kind === "video" ? tpl?.videoStyle : tpl?.imageStyle;
    const supportsKind = style && style !== "none";
    return (
      <Card key={kind}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[#5f5953]" />
              <CardTitle className="text-base">{label}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {m.is_mock ? (
                <Badge className="border border-border bg-transparent">Mock1</Badge>
              ) : (
                <Badge className="bg-[#211e1c] text-white">已接入</Badge>
              )}
              {m.last_test_status != null && (
                <Badge className={m.last_test_status < 400 ? "bg-[#dfeede] text-[#2f6b3a]" : "bg-[#f7e0dd] text-[#9b3a2f]"}>
                  {m.last_test_status}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">{desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">平台</Label>
            <Select value={e.provider} onValueChange={(v) => onPickProvider(kind, v as ProviderId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}{p.domestic ? " · 国内" : " · 国际"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tpl ? <div className="text-[11px] text-muted-foreground">{tpl.desc}</div> : null}
            {e.provider !== "mock" && style === "none" && (
              <div className="rounded border border-[#a06a2a]/40 bg-[#fcf4ea] px-2 py-1 text-[#a06a2a] text-[11px]">
                该平台不支持{kind === "video" ? "视频" : "图像"}生成，请选其他平台或在「自定义」填兼容 endpoint
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">完整接口 URL</Label>
            <Input
              value={e.baseUrl}
              onChange={(ev) => setEdit(kind, { baseUrl: ev.target.value })}
              placeholder={e.provider === "custom" ? "https://your-api.example.com/v1" : "选择平台后自动填入"}
              disabled={e.provider !== "custom"}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API Key</Label>
            <div className="flex gap-2">
              <Input
                type={e.showKey ? "text" : "password"}
                value={e.apiKey}
                onChange={(ev) => setEdit(kind, { apiKey: ev.target.value })}
                placeholder={m.api_key_set ? "已保存（留空保留）" : "sk-..."}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setEdit(kind, { showKey: !e.showKey })}>
                {e.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{kind === "video" ? "视频模型" : "图像模型"}名</Label>
            <Input
              value={e.model}
              onChange={(ev) => setEdit(kind, { model: ev.target.value })}
              placeholder="doubao-seedream-3-0-t2i-250415 / gpt-image-1 / seedream-3.0 ..."
              className="font-mono text-xs"
            />
          </div>
          {m.last_test_error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
              上次测试失败：{m.last_test_error.slice(0, 160)}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => save(kind)} disabled={e.saving}>
              {e.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span className="ml-1">保存</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => test(kind)} disabled={e.testing || Boolean(m.is_mock) || !supportsKind}>
              {e.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
              <span className="ml-1">测试</span>
            </Button>
          </div>
          {m.last_tested_at && (
            <div className="text-[10px] text-muted-foreground">最近测试：{m.last_tested_at}</div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <PageFrame>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">图像 / 视频模型</h1>
        <p className="mt-1 text-sm text-[#817a73]">图像与视频各自独立选平台 + Key。常见组合：豆包 doubao-seedream / Atlas Cloud / fal.ai / OpenAI gpt-image-1 · sora。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderCard("image", "图像生成模型", "封面、配图、AI 生图", ImageIcon)}
        {renderCard("video", "视频生成模型", "口播、短视频脚本转视频", Film)}
      </div>
    </PageFrame>
  );
}