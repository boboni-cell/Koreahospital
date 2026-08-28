"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Sched {
  id: number;
  account_id: number | null;
  slot_time: string;
}
interface Account { id: number; platform: string; handle: string; }

const PLATFORM_NAMES: Record<string, string> = { xiaohongshu: "小红书", douyin: "抖音" };

export default function SchedulePage() {
  const [items, setItems] = useState<Sched[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("1");
  const [slot, setSlot] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, a] = await Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]);
    setItems(s); setAccounts(a);
    if (a[0]) setAccountId(String(a[0].id));
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!slot) return toast.error("请选择时间");
    setSaving(true);
    try {
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: Number(accountId), slot_time: slot }),
      });
      toast.success("已加入日程");
      setSlot("");
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">日程管理</h2>
      <Card className="mb-4 max-w-xl">
        <CardContent className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 pt-4">
          <div className="space-y-1">
            <Label>账号</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "1")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {PLATFORM_NAMES[a.platform] ?? a.platform} · {a.handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>时间</Label>
            <Input type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving} className="bg-zinc-900 hover:bg-zinc-700">
            {saving ? "添加中" : "添加"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((it) => {
          const acc = accounts.find((a) => a.id === it.account_id);
          return (
            <Card key={it.id}>
              <CardContent className="flex items-center justify-between pt-4">
                <span className="text-sm font-medium text-zinc-800">{it.slot_time?.replace("T", " ")}</span>
                <span className="text-xs text-zinc-400">
                  {acc ? `${PLATFORM_NAMES[acc.platform] ?? acc.platform} · ${acc.handle}` : "—"}
                </span>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-sm text-zinc-400">暂无日程。</p>}
      </div>
    </PageFrame>
  );
}
