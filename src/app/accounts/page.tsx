"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  PLATFORMS,
  PLATFORM_NAME,
  ACCOUNT_ENVIRONMENT_STATUS,
  ACCOUNT_ENVIRONMENT_NAME,
  ACCOUNT_POSITIONING_OPTIONS,
} from "@/lib/constants";

interface Account {
  id: number;
  platform: string;
  handle: string;
  role: string;
  followers: number;
  status: string;
  project_id?: number;
  positioning?: string | null;
  operator_id?: number | null;
  operator_name?: string | null;
  environment_status?: string;
}

interface Pillar {
  id: number;
  name: string;
  description?: string | null;
}

interface AccountPillar {
  pillar_id: number;
  target_ratio: number;
  name: string;
}

const ROLE_NAMES: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  official: "官方号",
  case_study: "案例号",
  knowledge: "科普号",
  viral: "引流号",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [pillarsByAccount, setPillarsByAccount] = useState<Record<number, AccountPillar[]>>({});
  const [project, setProject] = useState<string>("");

  const [platform, setPlatform] = useState("xiaohongshu");
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("director");
  const [positioning, setPositioning] = useState("");
  const [environmentStatus, setEnvironmentStatus] = useState("configuring");

  const [editingFor, setEditingFor] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, number>>({});

  const load = () =>
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d: Account[]) => setAccounts(d));

  useEffect(() => {
    load();
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProject(d?.current?.name ?? ""))
      .catch(() => {});
    fetch("/api/content-pillars")
      .then((r) => r.json())
      .then((d: Pillar[]) => setPillars(d))
      .catch(() => {});
  }, []);

  function loadPillarsFor(accountId: number): Promise<AccountPillar[]> {
    return fetch(`/api/account-pillars?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d: AccountPillar[]) => {
        setPillarsByAccount((s) => ({ ...s, [accountId]: d }));
        return d;
      })
      .catch(() => [] as AccountPillar[]);
  }

  function add() {
    if (!handle.trim()) return toast.error("请填写账号名");
    fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, handle, role, followers: 0, status: "active", positioning, environment_status: environmentStatus }),
    })
      .then(() => {
        setHandle("");
        setPositioning("");
        toast.success("已新增账号");
        load();
      })
      .catch(() => toast.error("新增失败"));
  }

  function del(id: number) {
    fetch(`/api/accounts/${id}`, { method: "DELETE" })
      .then(() => {
        toast.success("已删除");
        setPillarsByAccount((s) => {
          const { [id]: _dropped, ...rest } = s;
          return rest;
        });
        load();
      })
      .catch(() => toast.error("删除失败"));
  }

  function openEditor(accountId: number) {
    setEditingFor(accountId);
    loadPillarsFor(accountId).then((d: AccountPillar[]) => {
      const map: Record<number, number> = {};
      for (const ap of d) map[ap.pillar_id] = ap.target_ratio;
      setDraft(map);
    });
  }

  function savePillars(accountId: number) {
    const items = Object.entries(draft)
      .filter(([, r]) => Number(r) > 0)
      .map(([pid, r]) => ({ pillarId: Number(pid), targetRatio: Number(r) }));
    fetch("/api/account-pillars", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, items }),
    })
      .then(() => {
        toast.success("已保存内容支柱");
        setEditingFor(null);
        loadPillarsFor(accountId);
      })
      .catch(() => toast.error("保存失败"));
  }

  return (
    <PageFrame>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#01011b]">账号矩阵</h2>
      <p className="mb-4 text-xs text-[#89828d]">{project ? `当前项目：${project}` : "当前项目：加载中…"}</p>

      {/* 截图导入提示：把账号首页截图发给右下角 Toni，Toni 会按 schema 自动填表 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#cbd8f1] bg-[#eef2fc] px-4 py-3 text-xs text-[#3d4f7a]">
        <span>📸</span>
        <span>截图导入：把账号首页截图发给右下角 Toni，队长按 schema 自动填表，无需手敲。</span>
      </div>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="flex-1 min-w-[140px]"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="账号名 / 昵称"
          />
          <Select value={role} onValueChange={(v) => setRole(v ?? "director")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_NAMES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-40"
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            placeholder="账号定位"
            list="account-positioning"
          />
          <datalist id="account-positioning">
            {ACCOUNT_POSITIONING_OPTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Select value={environmentStatus} onValueChange={(v) => setEnvironmentStatus(v ?? "configuring")}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_ENVIRONMENT_STATUS.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> 新增账号
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => {
          const ap = pillarsByAccount[a.id] ?? [];
          return (
            <Card key={a.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#01011b]">{a.handle}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{PLATFORM_NAME[a.platform] ?? a.platform}</Badge>
                    <button
                      onClick={() => del(a.id)}
                      className="text-[#a9a4ad] transition hover:text-rose-500"
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[#89828d]">
                  {ROLE_NAMES[a.role] ?? a.role} · 粉丝 {(a.followers ?? 0).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {a.positioning && <Badge className="border border-[#e4e0e6] bg-white">{a.positioning}</Badge>}
                  <Badge className="border border-[#e4e0e6] bg-white">{ACCOUNT_ENVIRONMENT_NAME[a.environment_status ?? "configuring"] ?? a.environment_status}</Badge>
                  {a.operator_name && <Badge className="border border-[#e4e0e6] bg-white">{a.operator_name}</Badge>}
                </div>

                {ap.length > 0 && editingFor !== a.id && (
                  <div className="flex flex-wrap gap-1">
                    {ap.map((p) => (
                      <span key={p.pillar_id} className="rounded-full bg-[#ecedf2] px-2 py-0.5 text-[11px] text-[#43394c]">
                        {p.name} {p.target_ratio > 0 ? `${p.target_ratio}%` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {editingFor === a.id ? (
                  <div className="space-y-2 border-t border-[#ecedf2] pt-2">
                    <p className="text-xs font-medium text-[#717a94]">内容支柱与占比</p>
                    {pillars.length === 0 && <p className="text-xs text-[#a9a4ad]">暂无支柱（可到“内容支柱”配置）</p>}
                    <div className="space-y-1">
                      {pillars.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="flex-1 text-xs text-[#43394c]">{p.name}</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-16"
                            value={draft[p.id] ?? 0}
                            onChange={(e) => setDraft((s) => ({ ...s, [p.id]: Number(e.target.value) || 0 }))}
                          />
                          <span className="text-xs text-[#89828d]">%</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => savePillars(a.id)}>保存</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingFor(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openEditor(a.id)}>
                    编辑支柱
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageFrame>
  );
}
