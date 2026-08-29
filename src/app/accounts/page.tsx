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
import { PLATFORMS } from "@/lib/constants";

interface Account {
  id: number;
  platform: string;
  handle: string;
  role: string;
  followers: number;
  status: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  weibo: "微博",
  zhihu: "知乎",
  shipinhao: "视频号",
  wechat: "公众号",
};
const ROLE_NAMES: Record<string, string> = {
  director: "院长号",
  consultant: "顾问号",
  official: "官方号",
  case_study: "案例号",
  knowledge: "科普号",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platform, setPlatform] = useState("xiaohongshu");
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("director");

  const load = () => fetch("/api/accounts").then((r) => r.json()).then((d: Account[]) => setAccounts(d));
  useEffect(() => { load(); }, []);

  function add() {
    if (!handle.trim()) return toast.error("请填写账号名");
    fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, handle, role, followers: 0, status: "active" }),
    })
      .then(() => { setHandle(""); toast.success("已新增账号"); load(); })
      .catch(() => toast.error("新增失败"));
  }

  function del(id: number) {
    fetch(`/api/accounts/${id}`, { method: "DELETE" })
      .then(() => { toast.success("已删除"); load(); })
      .catch(() => toast.error("删除失败"));
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-stone-900">账号矩阵</h2>

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
            className="flex-1 min-w-[160px]"
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
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> 新增账号
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-stone-800">{a.handle}</span>
                <div className="flex items-center gap-2">
                  <Badge>{PLATFORM_NAMES[a.platform] ?? a.platform}</Badge>
                  <button
                    onClick={() => del(a.id)}
                    className="text-stone-300 transition hover:text-rose-500"
                    aria-label="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-stone-400">
                {ROLE_NAMES[a.role] ?? a.role} · 粉丝 {(a.followers ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}
