"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  Info,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { LineChart, BarChart } from "@/components/charts/charts";
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

interface Account {
  id: number;
  platform: string;
  handle: string;
}
interface Summary {
  posts: number;
  reliable_posts: number;
  total_views: number;
  engagement_rate: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
}
interface Row {
  id: number;
  platform: string;
  handle: string | null;
  title: string | null;
  published_at: string | null;
  views: number;
  likes: number;
  saves: number;
  comments: number;
  shares: number;
  follower_gain: number | null;
  title_length: number;
  tag_count: number;
  engagement_rate: number | null;
  share_rate: number | null;
  follower_conversion_rate: number | null;
  low_sample: boolean;
  pillar_name: string | null;
}
interface Data {
  accounts: Account[];
  summary: Summary;
  platformGroups: (Summary & { platform: string })[];
  trend: {
    id: number;
    date: string;
    title: string;
    platform: string;
    engagement_rate: number | null;
  }[];
  titleGroups: {
    label: string;
    count: number;
    engagement_rate: number | null;
  }[];
  tagGroups: { label: string; count: number; engagement_rate: number | null }[];
  rows: Row[];
}

const PLATFORM: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
};

export default function PostAnalysisPage() {
  const [platform, setPlatform] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [windowName, setWindowName] = useState("7d");
  const [days, setDays] = useState("30");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("post-analysis-filters");
    if (!saved) return;
    try {
      const filters = JSON.parse(saved);
      setPlatform(filters.platform ?? "all");
      setAccountId(filters.accountId ?? "all");
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "post-analysis-filters",
      JSON.stringify({ platform, accountId }),
    );
  }, [platform, accountId]);
  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams({ platform, window: windowName, days });
    if (accountId !== "all") query.set("account_id", accountId);
    fetch("/api/data/posts?" + query)
      .then((response) => response.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [platform, accountId, windowName, days]);

  const accounts = (data?.accounts ?? []).filter(
    (account) => platform === "all" || account.platform === platform,
  );
  const trendSeries = useMemo(
    () =>
      (data?.trend ?? []).map((point) => ({
        date: point.date,
        followers: point.engagement_rate ?? 0,
        likes: 0,
        views: 0,
        saves: 0,
      })),
    [data],
  );
  const titleSeries = useMemo(
    () =>
      (data?.titleGroups ?? []).map((group) => ({
        date: group.label,
        followers: 0,
        likes: group.engagement_rate ?? 0,
        views: 0,
        saves: 0,
      })),
    [data],
  );
  const tagSeries = useMemo(
    () =>
      (data?.tagGroups ?? []).map((group) => ({
        date: group.label,
        followers: 0,
        likes: group.engagement_rate ?? 0,
        views: 0,
        saves: 0,
      })),
    [data],
  );

  return (
    <PageFrame>
      <section className="mb-5 overflow-hidden rounded-[24px] border border-[#e0d9d1] bg-[#171619] p-5 text-white shadow-[0_18px_46px_rgba(35,30,27,.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/38">
              Data center · Post intelligence
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em]">
              帖子分析
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              用统一7天窗口比较帖子表现；分享率、互动率和涨粉转化率都以有效浏览为分母。
            </p>
          </div>
          <Link href="/data/posts/import">
            <Button className="bg-white text-[#171619] hover:bg-[#eee9e3]">
              <FileSpreadsheet className="h-4 w-4" /> 导入官方数据
            </Button>
          </Link>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="平台">
            <Select
              value={platform}
              onValueChange={(value) => {
                setPlatform(value ?? "all");
                setAccountId("all");
              }}
            >
              <SelectTrigger className="border-white/10 bg-white/8 text-white">
                <SelectValue>
                  {platform === "all"
                    ? "全部平台（分开统计）"
                    : PLATFORM[platform]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台（分开统计）</SelectItem>
                <SelectItem value="xiaohongshu">小红书</SelectItem>
                <SelectItem value="douyin">抖音</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="账号">
            <Select
              value={accountId}
              onValueChange={(value) => setAccountId(value ?? "all")}
            >
              <SelectTrigger className="border-white/10 bg-white/8 text-white">
                <SelectValue>
                  {accountId === "all"
                    ? "全部账号"
                    : accounts.find(
                        (account) => String(account.id) === accountId,
                      )?.handle}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部账号</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="观察窗口">
            <Select
              value={windowName}
              onValueChange={(value) => setWindowName(value ?? "7d")}
            >
              <SelectTrigger className="border-white/10 bg-white/8 text-white">
                <SelectValue>
                  {
                    {
                      "24h": "发布后24小时",
                      "7d": "发布后7天",
                      "30d": "发布后30天",
                    }[windowName]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">发布后24小时</SelectItem>
                <SelectItem value="7d">发布后7天</SelectItem>
                <SelectItem value="30d">发布后30天</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="发布时间">
            <Select
              value={days}
              onValueChange={(value) => setDays(value ?? "30")}
            >
              <SelectTrigger className="border-white/10 bg-white/8 text-white">
                <SelectValue>
                  {
                    {
                      "30": "最近30天",
                      "90": "最近90天",
                      "365": "最近一年",
                      "3650": "全部时间",
                    }[days]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">最近30天</SelectItem>
                <SelectItem value="90">最近90天</SelectItem>
                <SelectItem value="365">最近一年</SelectItem>
                <SelectItem value="3650">全部时间</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[20px] bg-white p-8 text-sm text-[#817a73]">
          正在整理帖子数据…
        </div>
      ) : !data?.rows.length ? (
        <Empty />
      ) : (
        <div className="space-y-5">
          {platform === "all" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.platformGroups.map((group) => (
                <PlatformSummary
                  key={group.platform}
                  summary={group}
                  platform={group.platform}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                icon={TrendingUp}
                label="互动率中位数"
                value={rate(data.summary.engagement_rate)}
                note={`${data.summary.reliable_posts}/${data.summary.posts} 篇进入统计`}
                tone="bg-[#f1c7cd]"
              />
              <Stat
                icon={Share2}
                label="分享率中位数"
                value={rate(data.summary.share_rate)}
                note="分享 ÷ 有效浏览"
                tone="bg-[#f5d9a9]"
              />
              <Stat
                icon={Users}
                label="涨粉转化率"
                value={rate(data.summary.follower_conversion_rate)}
                note="缺失时不估算"
                tone="bg-[#bfe9da]"
              />
              <Stat
                icon={BarChart3}
                label="有效浏览"
                value={data.summary.total_views.toLocaleString()}
                note={`${data.summary.posts} 篇帖子`}
                tone="bg-[#cbd6f1]"
              />
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <Card className="border-[#e2dcd5] bg-[#fffefa]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#262220]">
                      历史帖子互动率趋势
                    </h3>
                    <p className="text-xs text-[#918981]">
                      按发布时间从旧到新，只比较同一观察窗口
                    </p>
                  </div>
                  <Badge className="bg-[#eee8ff] text-[#655a85]">
                    {windowName}
                  </Badge>
                </div>
                <LineChart
                  data={trendSeries}
                  field="followers"
                  color="#7f72b7"
                  unit="互动率 % · "
                />
              </CardContent>
            </Card>
            <Card className="border-[#e2dcd5] bg-[#f7f1e9]">
              <CardContent className="space-y-4 p-5">
                <div>
                  <Sparkles className="h-5 w-5 text-[#7f72b7]" />
                  <h3 className="mt-2 text-base font-semibold text-[#262220]">
                    分析口径
                  </h3>
                </div>
                <Rule
                  title="低样本"
                  text="有效浏览不足1000仍展示，但不进入中位数与归因结论。"
                />
                <Rule
                  title="平台分开"
                  text="小红书阅读与抖音播放均称有效浏览，两个平台不合并比率。"
                />
                <Rule
                  title="不制造归因"
                  text="官方文件没有单帖涨粉时，显示未提供，不用账号日增粉推算。"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StructureCard
              title="标题长度与互动率"
              note="按中文字符数分组；用于观察相关性"
              data={titleSeries}
            />
            <StructureCard
              title="标签数量与互动率"
              note="优先使用结构化标签，历史正文识别为推断"
              data={tagSeries}
            />
          </div>

          <Card className="overflow-hidden border-[#e2dcd5] bg-[#fffefa]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-[#262220]">
                    帖子明细
                  </h3>
                  <p className="text-xs text-[#918981]">按发布时间从新到旧</p>
                </div>
                <span className="text-xs text-[#817a73]">中国市场时间</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-[#f4efe9] text-[#756e67]">
                    <tr>
                      {[
                        "发布时间",
                        "平台/账号",
                        "帖子",
                        "有效浏览",
                        "互动率",
                        "分享率",
                        "涨粉转化",
                        "结构",
                      ].map((label) => (
                        <th
                          key={label}
                          className="whitespace-nowrap px-4 py-3 text-left font-semibold"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-[#ece6df] hover:bg-[#faf7f2]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[#817a73]">
                          {row.published_at?.slice(0, 16).replace("T", " ") ??
                            "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge>{PLATFORM[row.platform]}</Badge>
                          <span className="ml-2 text-[#817a73]">
                            {row.handle ?? "未关联"}
                          </span>
                        </td>
                        <td className="max-w-72 px-4 py-3">
                          <p className="truncate font-semibold text-[#332e2a]">
                            {row.title ?? "未命名帖子"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#99918a]">
                            {row.pillar_name ?? "未分类"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#332e2a]">
                          {row.views.toLocaleString()}
                          {row.low_sample && (
                            <Badge className="ml-2 bg-[#fae7bf] text-[#8a6321]">
                              低样本
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#6f63a7]">
                          {rate(row.engagement_rate)}
                        </td>
                        <td className="px-4 py-3">{rate(row.share_rate)}</td>
                        <td className="px-4 py-3">
                          {rate(row.follower_conversion_rate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#817a73]">
                          {row.title_length}字 · {row.tag_count}标签
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}

function rate(value: number | null) {
  return value == null ? "未提供" : `${value.toFixed(2)}%`;
}
function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold text-white/38">{label}</p>
      {children}
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <Card className={`${tone} border-transparent`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/65 text-[#3c3740]">
            <Icon className="h-4 w-4" />
          </span>
          <ArrowUpRight className="h-4 w-4 text-[#5d5752]/45" />
        </div>
        <p className="mt-5 text-[11px] font-semibold text-[#5f5852]">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#211e1c]">
          {value}
        </p>
        <p className="mt-1 text-[10px] text-[#6f6760]">{note}</p>
      </CardContent>
    </Card>
  );
}
function PlatformSummary({
  summary,
  platform,
}: {
  summary: Summary;
  platform: string;
}) {
  return (
    <Card
      className={`border-transparent ${platform === "xiaohongshu" ? "bg-[#f3c5cc]" : "bg-[#cbd7f2]"}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#605852]">
              {PLATFORM[platform]}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#211e1c]">
              互动率 {rate(summary.engagement_rate)}
            </p>
          </div>
          <Badge className="bg-white/65 text-[#49423d]">
            {summary.posts} 篇
          </Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
          <Mini label="分享率" value={rate(summary.share_rate)} />
          <Mini
            label="涨粉转化"
            value={rate(summary.follower_conversion_rate)}
          />
          <Mini label="有效样本" value={`${summary.reliable_posts}篇`} />
        </div>
      </CardContent>
    </Card>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white/48 p-2">
      <p className="text-[10px] text-[#746c65]">{label}</p>
      <p className="mt-1 font-semibold text-[#302b28]">{value}</p>
    </div>
  );
}
function StructureCard({
  title,
  note,
  data,
}: {
  title: string;
  note: string;
  data: {
    date: string;
    followers: number;
    likes: number;
    views: number;
    saves: number;
  }[];
}) {
  return (
    <Card className="border-[#e2dcd5] bg-[#fffefa]">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-[#262220]">{title}</h3>
        <p className="text-xs text-[#918981]">{note}</p>
        <div className="mt-3">
          <BarChart data={data} field="likes" color="#e6ad76" />
        </div>
      </CardContent>
    </Card>
  );
}
function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-t border-[#ddd4ca] pt-3">
      <p className="text-xs font-semibold text-[#4d4640]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#817870]">{text}</p>
    </div>
  );
}
function Empty() {
  return (
    <div className="grid min-h-80 place-items-center rounded-[24px] border border-[#e2dcd5] bg-[#fffefa] p-8 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[#eee8ff] text-[#6f63a7]">
          <CalendarDays className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-[#2d2926]">
          还没有可分析的帖子数据
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#817a73]">
          从小红书或抖音官方数据平台导出文件，系统会保留原文件并自动识别字段。
        </p>
        <Link href="/data/posts/import">
          <Button className="mt-5">
            <FileSpreadsheet className="h-4 w-4" /> 导入第一份数据
          </Button>
        </Link>
        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-[#99918a]">
          <Info className="h-3.5 w-3.5" /> 无单帖涨粉字段时不会估算
        </div>
      </div>
    </div>
  );
}
