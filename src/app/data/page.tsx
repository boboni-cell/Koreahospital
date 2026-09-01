"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { LineChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountCard {
  id: number;
  platform: string;
  handle: string;
  positioning: string | null;
  current_followers: number;
  delta_7d: number;
  delta_30d: number;
  posts_30d: number;
  engagement_rate: number | null;
  engagement_change: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
}
interface Point {
  date: string;
  followers: number;
  likes: number;
  views: number;
  saves: number;
}
const PLATFORM: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
};

export default function AccountDataPage() {
  const [platform, setPlatform] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [data, setData] = useState<{
    accounts: AccountCard[];
    series: Point[];
  } | null>(null);
  const [allAccounts, setAllAccounts] = useState<
    { id: number; platform: string; handle: string }[]
  >([]);
  useEffect(() => {
    fetch("/api/accounts")
      .then((response) => response.json())
      .then(setAllAccounts);
  }, []);
  useEffect(() => {
    const query = new URLSearchParams({ platform });
    if (accountId !== "all") query.set("account_id", accountId);
    fetch("/api/data/accounts?" + query)
      .then((response) => response.json())
      .then(setData);
  }, [platform, accountId]);

  return (
    <PageFrame>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">
            Data center · Account performance
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
            账号数据
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            环比与同平台账号对比；不同平台的互动率不直接排名。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/data/input">
            <Button variant="outline">
              <Download className="h-4 w-4" /> 导入账号数据
            </Button>
          </Link>
          <Link href="/data/posts">
            <Button>
              <ArrowUpRight className="h-4 w-4" /> 查看帖子分析
            </Button>
          </Link>
        </div>
      </div>
      <div className="mb-5 grid gap-3 rounded-[20px] border border-[#e2dcd5] bg-[#fffefa] p-4 md:grid-cols-[220px_260px_1fr]">
        <Select
          value={platform}
          onValueChange={(value) => {
            setPlatform(value ?? "all");
            setAccountId("all");
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {platform === "all" ? "全部平台" : PLATFORM[platform]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="xiaohongshu">小红书</SelectItem>
            <SelectItem value="douyin">抖音</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={accountId}
          onValueChange={(value) => setAccountId(value ?? "all")}
        >
          <SelectTrigger>
            <SelectValue>
              {accountId === "all"
                ? "全部账号"
                : allAccounts.find(
                    (account) => String(account.id) === accountId,
                  )?.handle}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部账号</SelectItem>
            {allAccounts
              .filter(
                (account) =>
                  platform === "all" || account.platform === platform,
              )
              .map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.handle}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end gap-2 text-xs text-[#918981]">
          <Database className="h-4 w-4" /> 数据来自账号官方导出 · 中国市场时间
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {(data?.accounts ?? []).map((account) => (
          <AccountPanel key={account.id} account={account} />
        ))}
      </div>
      {!data?.accounts.length && (
        <div className="mt-4 rounded-[22px] border border-[#e2dcd5] bg-[#fffefa] p-10 text-center text-sm text-[#817a73]">
          当前筛选下没有账号。
        </div>
      )}
      <Card className="mt-5 border-[#e2dcd5] bg-[#fffefa]">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#2d2926]">粉丝趋势</h3>
              <p className="text-xs text-[#918981]">当前筛选账号的官方日数据</p>
            </div>
            <Badge className="bg-[#dfe8f7] text-[#4f6386]">最近90条记录</Badge>
          </div>
          <LineChart
            data={data?.series ?? []}
            field="followers"
            color="#7185b3"
            unit="粉丝 "
          />
        </CardContent>
      </Card>
    </PageFrame>
  );
}

function rate(value: number | null) {
  return value == null ? "未提供" : `${value.toFixed(2)}%`;
}
function AccountPanel({ account }: { account: AccountCard }) {
  return (
    <Card
      className={`border-transparent ${account.platform === "xiaohongshu" ? "bg-[#f2c6cc]" : "bg-[#cbd8f1]"}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <Badge className="bg-white/65 text-[#514b46]">
              {PLATFORM[account.platform] ?? account.platform}
            </Badge>
            <h3 className="mt-3 truncate text-lg font-semibold text-[#28231f]">
              {account.handle}
            </h3>
            <p className="mt-1 truncate text-xs text-[#6e655e]">
              {account.positioning ?? "尚未填写账号定位"}
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-white/55">
            <Users className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric
            label="当前粉丝"
            value={account.current_followers.toLocaleString()}
          />
          <Metric label="7天净增" value={signed(account.delta_7d)} />
          <Metric label="30天净增" value={signed(account.delta_30d)} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Metric
            label="互动率中位数"
            value={rate(account.engagement_rate)}
            sub={
              account.engagement_change == null
                ? "无上期基准"
                : `环比 ${signed(account.engagement_change)}pp`
            }
          />
          <Metric label="分享率中位数" value={rate(account.share_rate)} />
          <Metric
            label="涨粉转化率"
            value={rate(account.follower_conversion_rate)}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-3 text-xs text-[#675f58]">
          <span>近30天 {account.posts_30d} 篇有效帖子</span>
          <Link
            href={`/data/positioning?account_id=${account.id}`}
            className="inline-flex items-center gap-1 font-semibold"
          >
            验证账号定位 <TrendingUp className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[12px] bg-white/45 p-2.5">
      <p className="text-[10px] text-[#746c65]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#302b28]">{value}</p>
      {sub && <p className="mt-0.5 text-[9px] text-[#817870]">{sub}</p>}
    </div>
  );
}
function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}
