"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function D1ConfigForm() {
  const [configured, setConfigured] = useState(false);
  const [form, setForm] = useState({ accountId: "", databaseId: "", databaseName: "", apiToken: "", apiBase: "https://api.cloudflare.com/client/v4" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/d1-config").then((r) => r.json()).then((d) => { setConfigured(d.configured); setForm((f) => ({ ...f, accountId: d.accountId || "", databaseId: d.databaseId || "", databaseName: d.databaseName || "", apiBase: d.apiBase || f.apiBase })); }).finally(() => setLoading(false)); }, []);
  async function save() { setSaving(true); try { const r = await fetch("/api/d1-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (!r.ok) throw new Error(); setConfigured(true); setForm((f) => ({ ...f, apiToken: "" })); toast.success("D1 配置已保存（当前仍使用本地数据库）"); } catch { toast.error("D1 配置保存失败"); } finally { setSaving(false); } }
  if (loading) return <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />加载中…</div>;
  return <Card className="max-w-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Cloudflare D1 数据库 <span className={`pill ${configured ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>{configured ? "已填写" : "待填写"}</span></CardTitle><CardDescription>D1 与 R2 分开：D1 存项目、账号、选题和数据；R2 存图片与视频。填写后仅保存配置，不会自动迁移或切换当前本地 SQLite。</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Cloudflare Account ID</Label><Input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} /></div><div className="space-y-1"><Label>D1 Database ID</Label><Input value={form.databaseId} onChange={(e) => setForm((f) => ({ ...f, databaseId: e.target.value }))} /></div></div><div className="space-y-1"><Label>D1 数据库名称（可选）</Label><Input value={form.databaseName} onChange={(e) => setForm((f) => ({ ...f, databaseName: e.target.value }))} placeholder="koreahospital" /></div><div className="space-y-1"><Label>Cloudflare API Token</Label><Input type="password" value={form.apiToken} onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))} placeholder={configured ? "已配置，留空不改" : "填写 D1 API Token"} /></div><Button onClick={save} disabled={saving || !form.accountId || !form.databaseId || (!configured && !form.apiToken)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存 D1 配置</Button></CardContent></Card>;
}
