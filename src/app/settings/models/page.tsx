"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, FlaskConical, Download, Cpu } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Model {
  id: string;
  name: string;
  kind: "text" | "image" | "video";
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

const KIND_LABEL: Record<Model["kind"], string> = {
  text: "文本/文案",
  image: "图像生成",
  video: "视频生成",
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);

  // 新增表单
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Model["kind"]>("text");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  async function load() {
    const d = await fetch("/api/models").then((r) => r.json());
    setModels(d);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name || !baseUrl || !model) return toast.error("请填全：名称 / Base URL / 模型名");
    setSaving(true);
    try {
      await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, baseUrl, apiKey, model }),
      });
      toast.success("已添加模型");
      setName("");
      setBaseUrl("");
      setApiKey("");
      setModel("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string) {
    await fetch("/api/models/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    toast.success("已切换启用模型");
  }

  async function remove(id: string) {
    if (!confirm("删除该模型配置？")) return;
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    await load();
    toast.success("已删除");
  }

  async function test(m: Model) {
    setBusyId(m.id);
    try {
      const r = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      }).then((r) => r.json());
      if (r.ok) toast.success(`测试通过${r.echo ? `：${r.echo}` : ""}`);
      else toast.error(`测试失败：${r.status || r.error || ""}`);
    } finally {
      setBusyId(null);
    }
  }

  async function pull(m: Model) {
    setPullingId(m.id);
    try {
      const r = await fetch("/api/models/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      }).then((r) => r.json());
      if (r.ok && r.models?.length) {
        toast.success(`拉取成功，可用模型 ${r.models.length} 个`, { description: r.models.slice(0, 6).join("、") });
      } else toast.error(`拉取失败：${r.status || r.error || ""}`);
    } finally {
      setPullingId(null);
    }
  }

  if (loading)
    return (
      <PageFrame>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
        </div>
      </PageFrame>
    );

  return (
    <PageFrame>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-zinc-900">模型管理</h2>
      <p className="mb-4 text-sm text-zinc-500">
        可添加任意多个文本 / 图像 / 视频模型（OpenAI 兼容端点）。同一类型可添加多个，点「启用」切换正在使用的那个。
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" /> 已配置模型（{models.length}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {models.length === 0 && (
              <p className="text-sm text-zinc-400">还没有模型，从右侧添加第一个吧。</p>
            )}
            {models.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-stone-100 bg-white/60 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-800">{m.name}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-zinc-500">
                      {KIND_LABEL[m.kind]}
                    </span>
                    <span className="text-xs text-zinc-400">{m.model}</span>
                    {m.isActive && (
                      <span className="pill bg-zinc-900 text-white">使用中</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{m.baseUrl}</div>
                </div>
                <div className="flex items-center gap-1">
                  {!m.isActive && (
                    <Button size="sm" variant="outline" onClick={() => setActive(m.id)}>
                      启用
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === m.id}
                    onClick={() => test(m)}
                    title="发送最小请求测试连通性"
                  >
                    {busyId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FlaskConical className="h-3.5 w-3.5" />
                    )}
                    测试
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pullingId === m.id}
                    onClick={() => pull(m)}
                    title="拉取该端点可用模型列表"
                  >
                    {pullingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    拉取
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> 新增模型
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>类型</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Model["kind"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文本 / 文案模型</SelectItem>
                  <SelectItem value="image">图像生成模型</SelectItem>
                  <SelectItem value="video">视频生成模型</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 kimi 文案" />
            </div>
            <div className="space-y-1">
              <Label>API Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-1">
              <Label>模型名</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o / kimi-k3 / ..."
              />
            </div>
            <Button onClick={add} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              添加
            </Button>
            <p className="text-xs text-zinc-400">
              文本模型会优先用于「AI 文案工坊 / 选题研究」；图像/视频模型用于「AI 生成配图 / 视频」。
            </p>
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
