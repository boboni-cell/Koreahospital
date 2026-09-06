"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "agent_models" | "local_codex" | "openai_api";
type Runtime = { mode: Mode; model: string; base_url: string; api_key_set: boolean };
type CodexStatus = { available: boolean; authenticated: boolean; reason?: string; version?: string; path?: string };

const MODEL_PRESETS = ["gpt-5.6-terra", "gpt-5.6-sol", "gpt-6-astra", "gpt-5.5"];

export function AgentRuntimePanel() {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [codex, setCodex] = useState<CodexStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function load() {
    const data = await fetch("/api/agent-runtime").then((r) => r.json());
    setRuntime(data.runtime);
    setCodex(data.codex);
  }
  useEffect(() => { load().catch(() => toast.error("无法读取 Agent 执行设置")); }, []);

  async function save() {
    if (!runtime) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { mode: runtime.mode, model: runtime.model, baseUrl: runtime.base_url };
      if (apiKey) body.apiKey = apiKey;
      const res = await fetch("/api/agent-runtime", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      setApiKey("");
      await load();
      toast.success("Agent 执行设置已保存");
    } catch (error) { toast.error(`保存失败：${String((error as Error).message).slice(0, 120)}`); }
    finally { setSaving(false); }
  }

  async function test() {
    setTesting(true);
    try {
      const res = await fetch("/api/agent-runtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "测试失败");
      toast.success(`模型测试通过：${data.output}`);
    } catch (error) { toast.error(`测试失败：${String((error as Error).message).slice(0, 180)}`); }
    finally { setTesting(false); }
  }

  if (!runtime) return <Card><CardContent className="flex items-center gap-2 pt-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />加载 Agent 执行设置…</CardContent></Card>;

  const localReady = Boolean(codex?.available && codex?.authenticated);
  return (
    <Card id="agent-runtime">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Agent 执行方式与模型</CardTitle>
            <p className="mt-1 text-xs text-[#89828d]">可随时切换。本地模式使用这台电脑登录的 Codex CLI；API 模式使用这里填写的 OpenAI API Key。</p>
          </div>
          <Badge className={runtime.mode === "agent_models" ? "bg-zinc-100 text-zinc-600" : "bg-[#dfeede] text-[#2f6b3a]"}>
            {runtime.mode === "agent_models" ? "按 Agent 配置" : runtime.mode === "local_codex" ? "本地 Codex" : "OpenAI API"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">执行方式</Label>
          <Select value={runtime.mode} onValueChange={(mode) => mode && setRuntime({ ...runtime, mode: mode as Mode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="agent_models">按原有 Agent 模型配置</SelectItem>
              <SelectItem value="local_codex">本地 Codex CLI</SelectItem>
              <SelectItem value="openai_api">OpenAI API</SelectItem>
            </SelectContent>
          </Select>
          {runtime.mode === "agent_models" && <p className="text-[11px] text-muted-foreground">保持原有行为：研究员、总编等角色分别使用「Agent 模型」页面的配置。</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">当前模型</Label>
          <div className="flex gap-2">
            <Select value={MODEL_PRESETS.includes(runtime.model) ? runtime.model : "custom"} onValueChange={(model) => model && model !== "custom" && setRuntime({ ...runtime, model })}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_PRESETS.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                <SelectItem value="custom">自定义模型名</SelectItem>
              </SelectContent>
            </Select>
            <Input value={runtime.model} onChange={(event) => setRuntime({ ...runtime, model: event.target.value })} className="font-mono text-xs" placeholder="例如 gpt-5.6-terra" />
          </div>
        </div>

        {runtime.mode === "openai_api" && <>
          <div className="space-y-1">
            <Label className="text-xs">OpenAI API Key</Label>
            <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={runtime.api_key_set ? "已保存（留空则保留）" : "sk-..."} className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Chat Completions 接口</Label>
            <Input value={runtime.base_url} onChange={(event) => setRuntime({ ...runtime, base_url: event.target.value })} className="font-mono text-xs" placeholder="https://api.openai.com/v1/chat/completions" />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Key 只在服务端使用，不会回传到页面。</p>
        </>}

        {runtime.mode === "local_codex" && <div className={`rounded-xl p-3 text-xs ${localReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          <div className="flex items-center gap-2 font-medium">{localReady ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />} {codex?.reason || "正在检测本地 Codex CLI…"}</div>
          {!localReady && <p className="mt-1">请在这台电脑安装 Codex CLI 并执行 <code>codex login</code>，然后点击“重新检测”。</p>}
          {codex?.version && <p className="mt-1 opacity-80">{codex.version}{codex.path ? ` · ${codex.path}` : ""}</p>}
        </div>}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={saving}><Save className="h-3.5 w-3.5" />{saving ? "保存中…" : "保存设置"}</Button>
          {runtime.mode === "local_codex" && <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="h-3.5 w-3.5" />重新检测</Button>}
          {runtime.mode !== "agent_models" && <Button size="sm" variant="outline" onClick={test} disabled={testing}><CheckCircle2 className="h-3.5 w-3.5" />{testing ? "测试中…" : "测试当前模型"}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
