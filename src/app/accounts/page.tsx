"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((d) => setAccounts(d));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">账号矩阵</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-800">{a.handle}</span>
                <Badge>{PLATFORM_NAMES[a.platform] ?? a.platform}</Badge>
              </div>
              <div className="text-xs text-zinc-400">
                角色：{a.role} · 粉丝 {(a.followers ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}
