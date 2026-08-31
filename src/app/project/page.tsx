"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Users, Layers, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_NAME } from "@/lib/constants";

interface ProjectBrief {
  id: number; name: string; marketing_brief: string | null; audience: string | null;
  voice: string | null; conversion_goal: string | null; banned_terms: string | null;
}
interface AccountRow {
  id: number; platform: string; handle: string; role: string | null;
  positioning: string | null; environment_status: string | null; followers: number; operator_name: string | null;
}
interface PillarRow { id: number; name: string; description: string | null }

export default function ProjectPage() {
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [platformSplit, setPlatformSplit] = useState<Record<string, AccountRow[]>>({});
  const [form, setForm] = useState({ marketing_brief: "", audience: "", voice: "", conversion_goal: "", banned_terms: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/projects/brief")
      .then((r) => r.json())
      .then((d) => {
        setBrief(d.project);
        setAccounts(d.accounts ?? []);
        setPlatformSplit(d.platformSplit ?? {});
        setForm({
          marketing_brief: d.project?.marketing_brief ?? "",
          audience: d.project?.audience ?? "",
          voice: d.project?.voice ?? "",
          conversion_goal: d.project?.conversion_goal ?? "",
          banned_terms: d.project?.banned_terms ?? "",
        });
      })
      .catch(() => {});
  };
  useEffect(() => { load(); }, []);

  function save() {
    setSaving(true);
    fetch("/api/projects/brief", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then(() => { toast.success("项目简报已保存"); load(); })
      .catch(() => toast.error("保存失败"))
      .finally(() => setSaving(false));
  }

  return (
    <PageFrame>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">项目简报与账号定位卡</h2>
          <p className="text-sm text-stone-500">{brief ? `当前项目：${brief.name}` : "加载项目…"}</p>
        </div>
        <Link href="/workbench" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">回工作区 <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="text-sm font-semibold text-stone-800">项目营销简报</h3>
            <Field label="营销对象"><Input value={form.marketing_brief} onChange={(e) => setForm({ ...form, marketing_brief: e.target.value })} placeholder="例如：脱发/植发人群" /></Field>
            <Field label="目标人群"><Textarea className="min-h-16" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="年龄、性别、城市、痛点…" /></Field>
            <Field label="品牌语气"><Input value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} placeholder="专业、亲切、克制" /></Field>
            <Field label="转化目标"><Input value={form.conversion_goal} onChange={(e) => setForm({ ...form, conversion_goal: e.target.value })} placeholder="私信咨询 / 预约到院" /></Field>
            <Field label="禁区词"><Textarea className="min-h-16" value={form.banned_terms} onChange={(e) => setForm({ ...form, banned_terms: e.target.value })} placeholder="最佳、保证、100% 成功…" /></Field>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> 保存简报</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-800">平台分工表</h3>
                <Badge className="bg-sky-50 text-sky-600"><Users className="h-3 w-3" /> {accounts.length} 账号</Badge>
              </div>
              <div className="space-y-3">
                {Object.entries(platformSplit).map(([platform, list]) => (
                  <div key={platform}>
                    <p className="mb-1 text-xs font-medium text-stone-500">{PLATFORM_NAME[platform] ?? platform}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((a) => (
                        <span key={a.id} className="rounded-lg bg-stone-50 px-2 py-1 text-xs text-stone-600">
                          {a.handle}
                          <span className="text-stone-300"> · {a.role ?? "-"}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold text-stone-800">账号定位卡</h3>
              <div className="space-y-2">
                {accounts.length === 0 ? <p className="text-xs text-stone-300">暂无账号</p> : accounts.map((a) => (
                  <div key={a.id} className="rounded-lg border border-stone-100 bg-stone-50/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-stone-700">{a.handle}</p>
                      <span className="text-[11px] text-stone-400">{PLATFORM_NAME[a.platform] ?? a.platform}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-stone-500">
                      <span>定位：{a.positioning ?? "未定"}</span>
                      <span>· 环境：{a.environment_status ?? "配置中"}</span>
                      <span>· 运营：{a.operator_name ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  );
}
