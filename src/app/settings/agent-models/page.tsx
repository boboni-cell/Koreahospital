"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, FlaskConical, Download, Eye, EyeOff } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { AGENT_LABELS } from "@/lib/agent-labels";

type AgentRole = "researcher" | "strategist" | "writer" | "designer" | "publisher" | "analyst";
type ProviderId = "mock" | "openai" | "deepseek" | "kimi" | "volcengine" | "dashscope" | "siliconflow" | "openrouter" | "minimax" | "nanogpt" | "custom";

interface ProviderInfo { id: ProviderId; label: string; desc: string; chat: string; image: string; video: string; imageStyle: string; videoStyle: string; defaultModel: string; domestic: boolean; }
interface AgentModel {
  id: number;
  role: AgentRole;
  provider: ProviderId;
  base_url: string;
  api_key_set: boolean;
  model: string;
  kind: "text" | "image" | "video";
  is_mock: number;
  last_tested_at: string | null;
  last_test_status: number | null;
  last_test_error: string | null;
}

const ROLES: { role: AgentRole; label: string; desc: string }[] = [
  { role: "researcher", label: "研究员", desc: "选题研究、信号收集" },
  { role: "strategist", label: "策略师", desc: "项目总控、平台决策" },
  { role: "writer", label: AGENT_LABELS.writer, desc: "选题整理、小红书/抖音文案与脚本" },
  { role: "designer", label: AGENT_LABELS.designer, desc: "封面、分镜、配图" },
  { role: "publisher", label: AGENT_LABELS.publisher, desc: "发布包、检查清单" },
  { role: "analyst", label: AGENT_LABELS.analyst, desc: "复盘归因、回写建议" },
];

const NO_PULL: ProviderId[] = ["volcengine"]; // 不支持通用 /models

export default function AgentModelsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [list, setList] = useState<AgentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, {
    provider: ProviderId;
    baseUrl: string;
    apiKey: string;
    model: string;
    showKey: boolean;
    saving: boolean; testing: boolean; pulling: boolean; pulled: string[];
  }>>({});

  async function load() {
    const r = await fetch("/api/agent-models").then((x) => x.json());
    setProviders(r.providers || []);
    const rows: AgentModel[] = r.models || [];
    setList(rows);
    const next: typeof edits = { ...edits };
    for (const m of rows) {
      next[m.role] = next[m.role] || {
        provider: m.provider, baseUrl: m.base_url, apiKey: "", model: m.model,
        showKey: false, saving: false, testing: false, pulling: false, pulled: [],
      };
      next[m.role].provider = m.provider;
      next[m.role].baseUrl = m.base_url;
      next[m.role].model = m.model;
    }
    setEdits(next);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function setEdit(role: string, patch: Partial<NonNullable<typeof edits[string]>>) {
    setEdits((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }));
  }

  async function save(role: AgentRole) {
      const e = edits[role];
      if (!e) return;
      const cur = list.find((x) => x.role === role);
      setEdit(role, { saving: true });
      try {
        // 仅在用户主动碰过 apiKey 输入框时才带 apiKey 字段；
        // 否则省略 → 后端"未传"路径 → 保留 DB 已有 key，不会误清空。
        const apiKeyTouched = e.apiKey.length > 0;
        const body: Record<string, unknown> = {
          role,
          provider: e.provider,
          baseUrl: e.baseUrl,
          model: e.model,
        };
        if (apiKeyTouched || (cur && !cur.api_key_set)) body.apiKey = e.apiKey;
        const res = await fetch(`/api/agent-models/${role}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success(`${role} 已保存`);
        setEdit(role, { apiKey: "" });
        await load();
      } catch (err) {
        toast.error(`保存失败：${(err as Error).message}`);
      } finally {
        setEdit(role, { saving: false });
      }
    }

  async function test(role: AgentRole) {
    setEdit(role, { testing: true });
    try {
      const res = await fetch(`/api/agent-models/${role}/test`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = await res.json();
      if (j.ok) toast.success(`${role} 测试通过${j.echo ? `: ${j.echo.slice(0, 40)}` : ""}`);
      else toast.error(`${role} 测试失败：${j.error || `HTTP ${j.status}`}`);
      await load();
    } finally {
      setEdit(role, { testing: false });
    }
  }

  async function pull(role: AgentRole) {
    setEdit(role, { pulling: true });
    try {
      const res = await fetch(`/api/agent-models/${role}/pull`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = await res.json();
      if (j.ok) {
        setEdit(role, { pulled: j.models || [] });
        toast.success(`拉取到 ${j.models?.length || 0} 个模型`);
      } else {
        toast.error(`${j.error || `HTTP ${j.status}`}`);
      }
    } finally {
      setEdit(role, { pulling: false });
    }
  }

  function onPickProvider(role: AgentRole, p: ProviderId) {
    const tpl = providers.find((x) => x.id === p);
    setEdit(role, {
      provider: p,
      baseUrl: p === "custom" ? (edits[role]?.baseUrl || "") : (tpl?.chat || ""),
      model: tpl?.defaultModel || edits[role]?.model || "",
    });
  }

  if (loading) {
    return (
      <PageFrame>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />加载中…</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">Agent 模型</h1>
        <p className="mt-1 text-sm text-[#817a73]">每个 Agent 独立选平台 + API Key + 模型名。选平台后 baseUrl 自动填，可手动覆盖（自定义）。填 Key 后可一键拉取模型清单 + 测试连通。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ROLES.map(({ role, label, desc }) => {
          const m = list.find((x) => x.role === role);
          const e = edits[role];
          if (!m || !e) return null;
          return (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription className="text-xs">{desc} · <code className="text-[11px]">{role}</code></CardDescription>
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
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">平台</Label>
                  <Select value={e.provider} onValueChange={(v) => onPickProvider(role, v as ProviderId)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}{p.domestic ? " · 国内" : " · 国际"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const tpl = providers.find((x) => x.id === e.provider);
                    return tpl ? <div className="text-[11px] text-muted-foreground">{tpl.desc}</div> : null;
                  })()}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">完整接口 URL</Label>
                  <Input
                    value={e.baseUrl}
                    onChange={(ev) => setEdit(role, { baseUrl: ev.target.value })}
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
                      onChange={(ev) => setEdit(role, { apiKey: ev.target.value })}
                      placeholder={m.api_key_set ? "已保存（留空保留）" : "sk-..."}
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setEdit(role, { showKey: !e.showKey })}>
                      {e.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">模型名</Label>
                  <div className="flex gap-2">
                    <Input
                      value={e.model}
                      onChange={(ev) => setEdit(role, { model: ev.target.value })}
                      placeholder="gpt-4o-mini / deepseek-chat / doubao-..."
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => pull(role)} disabled={e.pulling || NO_PULL.includes(e.provider) || Boolean(m.is_mock)}>
                      {e.pulling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      <span className="ml-1">拉取</span>
                    </Button>
                  </div>
                  {NO_PULL.includes(e.provider) && (
                    <div className="text-[11px] text-[#a06a2a]">该平台不支持通用 /models 列表；请到控制台创建接入点，把模型 ID 直接填到「模型名」</div>
                  )}
                  {e.pulled.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.pulled.slice(0, 12).map((id) => (
                        <button key={id} type="button" onClick={() => setEdit(role, { model: id })} className="rounded border border-border px-2 py-0.5 text-[10px] font-mono hover:bg-muted">
                          {id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {m.last_test_error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
                    上次测试失败：{m.last_test_error.slice(0, 160)}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => save(role)} disabled={e.saving}>
                    {e.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    <span className="ml-1">保存</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => test(role)} disabled={e.testing || Boolean(m.is_mock)}>
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
        })}
      </div>
    </PageFrame>
  );
}
