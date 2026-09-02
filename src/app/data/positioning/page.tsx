"use client";

import { useEffect, useState } from "react";
import {
  Check,
  History,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Account {
  id: number;
  platform: string;
  handle: string;
  positioning: string | null;
}
interface Version {
  id: number;
  version: number;
  positioning: string | null;
  audience: string | null;
  voice: string | null;
  cta: string | null;
  banned_terms: string | null;
  frequency: string | null;
  notes: string | null;
  evidence: string | null;
  status: string;
  created_at: string;
  activated_at: string | null;
}
interface Pillar {
  id: number;
  name: string;
  description: string | null;
  target_ratio: number | null;
  posts: number;
  engagement_rate: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
}
const EMPTY = {
  positioning: "",
  audience: "",
  voice: "",
  cta: "",
  banned_terms: "",
  frequency: "",
  notes: "",
  evidence: "",
};

export default function PositioningPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function load(id?: string) {
    const selected = id || accountId;
    fetch("/api/data/positioning" + (selected ? `?account_id=${selected}` : ""))
      .then((response) => response.json())
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setVersions(data.versions ?? []);
        setPillars(data.pillars ?? []);
        const preferred =
          (data.versions ?? []).find(
            (version: Version) => version.status === "active",
          ) ?? data.versions?.[0];
        const account = (data.accounts ?? []).find(
          (row: Account) => String(row.id) === selected,
        );
        setForm(
          preferred
            ? (Object.fromEntries(
                Object.keys(EMPTY).map((key) => [key, preferred[key] ?? ""]),
              ) as typeof EMPTY)
            : {
                ...EMPTY,
                positioning: account?.positioning ?? "",
                audience: data.brief?.audience ?? "",
                voice: data.brief?.voice ?? "",
                cta: data.brief?.conversion_goal ?? "",
                banned_terms: data.brief?.banned_terms ?? "",
              },
        );
        if (!selected && data.accounts?.[0]) {
          setAccountId(String(data.accounts[0].id));
          load(String(data.accounts[0].id));
        }
      });
  }
  useEffect(() => {
    const initial =
      new URLSearchParams(window.location.search).get("account_id") ?? "";
    setAccountId(initial);
    load(initial);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/data/positioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: Number(accountId), ...form }),
      });
      if (!response.ok) throw new Error();
      toast.success("新定位版本已保存为草稿");
      load();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }
  async function activate(id: number) {
    const response = await fetch("/api/data/positioning", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      toast.success("定位版本已启用");
      load();
    }
  }
  const selected = accounts.find((account) => String(account.id) === accountId);

  return (
    <PageFrame>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">
            Data center · Positioning
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
            账号定位
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            策略卡与实际内容表现放在一起验证；新定位先保存草稿，确认后再启用。
          </p>
        </div>
        <Select
          value={accountId}
          onValueChange={(value) => {
            setAccountId(value ?? "");
            load(value ?? "");
          }}
        >
          <SelectTrigger className="w-64 bg-white">
            <SelectValue>{selected?.handle ?? "选择账号"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                {account.handle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="border-[#e2dcd5] bg-[#fffefa]">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-[#eee8ff] text-[#665a86]">
                  {selected?.platform === "douyin" ? "抖音" : "小红书"}
                </Badge>
                <h3 className="mt-2 text-lg font-semibold text-[#2d2926]">
                  {selected?.handle ?? "选择账号"} · 策略卡
                </h3>
              </div>
              <Target className="h-6 w-6 text-[#7d70a7]" />
            </div>
            <Field label="核心定位 / 价值承诺">
              <Input
                value={form.positioning}
                onChange={(event) =>
                  setForm({ ...form, positioning: event.target.value })
                }
              />
            </Field>
            <Field label="目标人群与典型问题">
              <Textarea
                value={form.audience}
                onChange={(event) =>
                  setForm({ ...form, audience: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="语气与视角">
                <Input
                  value={form.voice}
                  onChange={(event) =>
                    setForm({ ...form, voice: event.target.value })
                  }
                />
              </Field>
              <Field label="CTA / 转化目标">
                <Input
                  value={form.cta}
                  onChange={(event) =>
                    setForm({ ...form, cta: event.target.value })
                  }
                />
              </Field>
              <Field label="发布频率">
                <Input
                  value={form.frequency}
                  onChange={(event) =>
                    setForm({ ...form, frequency: event.target.value })
                  }
                  placeholder="例如：每周4篇"
                />
              </Field>
              <Field label="版本依据">
                <Input
                  value={form.evidence}
                  onChange={(event) =>
                    setForm({ ...form, evidence: event.target.value })
                  }
                  placeholder="例如：近30天分享率复盘"
                />
              </Field>
            </div>
            <Field label="禁区词 / 证据要求">
              <Textarea
                value={form.banned_terms}
                onChange={(event) =>
                  setForm({ ...form, banned_terms: event.target.value })
                }
              />
            </Field>
            <Field label="调整说明">
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </Field>
            <Button onClick={save} disabled={saving || !accountId}>
              <Save className="h-4 w-4" /> {saving ? "保存中…" : "保存为新草稿"}
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="border-[#e2dcd5] bg-[#171619] text-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#c8b8ff]" />
                <h3 className="font-semibold">内容支柱表现验证</h3>
              </div>
              <p className="mt-1 text-xs text-white/42">
                仅统计7天窗口且有效浏览≥1000的帖子
              </p>
              <div className="mt-4 space-y-2">
                {pillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="rounded-[14px] bg-white/7 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {pillar.name}
                      </span>
                      <span className="text-[10px] text-white/40">
                        目标 {pillar.target_ratio ?? 0}% · {pillar.posts}篇
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <DarkMetric
                        label="互动率"
                        value={rate(pillar.engagement_rate)}
                      />
                      <DarkMetric
                        label="分享率"
                        value={rate(pillar.share_rate)}
                      />
                      <DarkMetric
                        label="涨粉转化"
                        value={rate(pillar.follower_conversion_rate)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#e2dcd5] bg-[#fffefa]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#746b8d]" />
                <h3 className="font-semibold text-[#2d2926]">定位版本</h3>
              </div>
              <div className="mt-3 space-y-2">
                {versions.length === 0 ? (
                  <p className="text-xs text-[#918981]">
                    还没有版本，先保存第一版策略卡。
                  </p>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-[13px] border border-[#e7e0d9] bg-[#f8f4ef] p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#3a3531]">
                            v{version.version}
                          </span>
                          <Badge
                            className={
                              version.status === "active"
                                ? "bg-[#dff4e8] text-[#35684d]"
                                : "bg-[#eee8ff] text-[#665a86]"
                            }
                          >
                            {version.status === "active"
                              ? "已启用"
                              : version.status === "draft"
                                ? "草稿"
                                : "历史"}
                          </Badge>
                        </div>
                        <p className="mt-1 max-w-64 truncate text-[11px] text-[#817a73]">
                          {version.positioning || "未填写定位"}
                        </p>
                      </div>
                      {version.status === "draft" && (
                        <Button size="sm" onClick={() => activate(version.id)}>
                          <Check className="h-3.5 w-3.5" /> 启用
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 flex gap-2 rounded-[12px] bg-[#f4efe9] p-3 text-[11px] text-[#716961]">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                AI或数据只能提出定位调整建议，启用动作必须由运营人员确认。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#6e6760]">{label}</Label>
      {children}
    </div>
  );
}
function rate(value: number | null) {
  return value == null ? "未提供" : `${value.toFixed(2)}%`;
}
function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-white/7 px-2 py-1.5">
      <p className="text-[9px] text-white/35">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  );
}
