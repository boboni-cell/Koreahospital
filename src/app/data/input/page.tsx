"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { PLATFORM_NAME } from "@/lib/constants";

interface Account {
  id: number;
  platform: string;
  handle: string;
}

export default function DataInputPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    followers: 0,
    likes: 0,
    saves: 0,
    comments: 0,
    shares: 0,
    views: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((d) => {
      setAccounts(d);
      if (d[0]) setAccountId(String(d[0].id));
    });
  }, []);

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: Number(v) || 0 }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: Number(accountId), date, ...form }),
      });
      toast.success("数据已录入");
    } finally {
      setSaving(false);
    }
  }

  const fields: [keyof typeof form, string][] = [
    ["followers", "粉丝数"],
    ["views", "播放/浏览"],
    ["likes", "点赞"],
    ["saves", "收藏"],
    ["comments", "评论"],
    ["shares", "分享"],
  ];

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">数据录入</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>按账号录入每日数据</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>账号</Label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "1")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {PLATFORM_NAME[a.platform] ?? a.platform} · {a.handle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>日期</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fields.map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  type="number"
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
          </div>
          <Button onClick={save} disabled={saving} className="bg-zinc-900 hover:bg-zinc-700">
            {saving ? "录入中" : "录入数据"}
          </Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
