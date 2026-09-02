"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELDS = [
  ["external_post_id", "帖子 ID"],
  ["post_url", "帖子链接"],
  ["title", "标题"],
  ["content", "正文"],
  ["tags", "标签"],
  ["published_at", "发布时间"],
  ["views", "阅读/播放"],
  ["likes", "点赞"],
  ["saves", "收藏"],
  ["comments", "评论"],
  ["shares", "分享"],
  ["follower_gain", "单帖新增粉丝"],
  ["pillar", "内容支柱"],
] as const;

interface Account {
  id: number;
  platform: string;
  handle: string;
}
interface Preview {
  token: string;
  filename: string;
  hash: string;
  headers: string[];
  preview: string[][];
  rowsCount: number;
  mapping: Record<string, number>;
}
interface Batch {
  id: number;
  platform: string;
  handle: string | null;
  filename: string;
  rows_count: number;
  inserted: number;
  updated: number;
  skipped: number;
  created_at: string;
}

export default function PostImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platform, setPlatform] = useState("xiaohongshu");
  const [accountId, setAccountId] = useState("");
  const [windowName, setWindowName] = useState("7d");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: Account[]) => {
        setAccounts(rows);
        const first = rows.find((row) => row.platform === platform);
        if (first) setAccountId(String(first.id));
      });
  }, []);
  useEffect(() => {
    fetch("/api/data/post-import")
      .then((r) => r.json())
      .then(setBatches);
  }, []);
  useEffect(() => {
    const first = accounts.find((row) => row.platform === platform);
    if (
      first &&
      !accounts.some(
        (row) => String(row.id) === accountId && row.platform === platform,
      )
    )
      setAccountId(String(first.id));
  }, [platform, accounts, accountId]);

  async function choose(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/data/post-import", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "解析失败");
      setPreview(data);
      setMapping(data.mapping);
      toast.success(`识别到 ${data.rowsCount} 行数据`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析失败");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview || !accountId) return toast.error("请选择账号并上传文件");
    setBusy(true);
    try {
      const response = await fetch("/api/data/post-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: preview.token,
          filename: preview.filename,
          platform,
          account_id: Number(accountId),
          window: windowName,
          mapping,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "导入失败");
      setResult(data);
      fetch("/api/data/post-import")
        .then((r) => r.json())
        .then(setBatches);
      toast.success("帖子数据已导入");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9b948d]">
            数据中心 · 中国市场时间
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-.03em] text-[#171619]">
            导入官方帖子数据
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            支持 CSV、TXT、XLSX；自动识别列名，确认映射后再写入。
          </p>
        </div>
        <Link
          href="/data/posts"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5c5474]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 返回帖子分析
        </Link>
      </div>

      <Card className="overflow-hidden border-[#e1dbd4] bg-[#fffefa]">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="平台">
              <Select
                value={platform}
                onValueChange={(value) => setPlatform(value ?? "xiaohongshu")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {platform === "douyin" ? "抖音" : "小红书"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xiaohongshu">小红书</SelectItem>
                  <SelectItem value="douyin">抖音</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="账号">
              <Select
                value={accountId}
                onValueChange={(value) => setAccountId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {accounts.find((row) => String(row.id) === accountId)
                      ?.handle ?? "请选择账号"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((row) => row.platform === platform)
                    .map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>
                        {row.handle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="观察窗口">
              <Select
                value={windowName}
                onValueChange={(value) => setWindowName(value ?? "7d")}
              >
                <SelectTrigger>
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
            </Field>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid min-h-40 w-full place-items-center rounded-[18px] border-2 border-dashed border-[#d8d0c8] bg-[#f8f4ef] text-center transition hover:border-[#a99bcf] hover:bg-[#f5f0fb]"
          >
            <span>
              <FileSpreadsheet className="mx-auto h-8 w-8 text-[#7b719a]" />
              <span className="mt-2 block text-sm font-semibold text-[#39343f]">
                {busy
                  ? "正在解析…"
                  : preview
                    ? preview.filename
                    : "选择官方导出文件"}
              </span>
              <span className="mt-1 block text-xs text-[#918981]">
                原文件会保存在本地导入档案中
              </span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) choose(file);
              event.target.value = "";
            }}
          />

          {preview && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Select
                      value={String(mapping[key] ?? -1)}
                      onValueChange={(value) =>
                        setMapping((current) => ({
                          ...current,
                          [key]: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">不导入</SelectItem>
                        {preview.headers.map((header, index) => (
                          <SelectItem
                            key={`${key}-${index}`}
                            value={String(index)}
                          >
                            {header || `第${index + 1}列`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
              </div>
              <div className="overflow-x-auto rounded-[14px] border border-[#e3ddd6]">
                <table className="min-w-full text-xs">
                  <thead className="bg-[#f4efe9] text-[#746d66]">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th
                          key={index}
                          className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-[#ece6df]">
                        {row.map((value, index) => (
                          <td
                            key={index}
                            className="max-w-48 truncate px-3 py-2 text-[#514b46]"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between rounded-[14px] bg-[#eee8ff] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#39304f]">
                    准备导入 {preview.rowsCount} 行
                  </p>
                  <p className="text-xs text-[#766b91]">
                    重复帖子会更新最新窗口数据，并保留本次导入记录。
                  </p>
                </div>
                <Button onClick={confirm} disabled={busy}>
                  <Upload className="h-4 w-4" /> 确认导入
                </Button>
              </div>
            </>
          )}
          {result && (
            <div className="flex items-center gap-3 rounded-[14px] bg-[#dff4e8] px-4 py-3 text-sm text-[#285c43]">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                新增 {result.inserted} 条，更新 {result.updated} 条，跳过{" "}
                {result.skipped} 条。
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5 border-[#e1dbd4] bg-[#fffefa]">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-[#766b91]" />
            <div>
              <h3 className="text-sm font-semibold text-[#342f2b]">
                最近导入记录
              </h3>
              <p className="text-[11px] text-[#918981]">
                原文件保存在本地，重复导入会更新帖子并保留每个批次。
              </p>
            </div>
          </div>
          {batches.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[#f4efe9] text-[#746d66]">
                  <tr>
                    {["时间", "平台 / 账号", "文件", "结果"].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-left font-semibold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-t border-[#ece6df]">
                      <td className="whitespace-nowrap px-3 py-2 text-[#817a73]">
                        {batch.created_at.slice(0, 16)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {batch.platform === "douyin" ? "抖音" : "小红书"} ·{" "}
                        {batch.handle ?? "未关联"}
                      </td>
                      <td className="max-w-72 truncate px-3 py-2">
                        {batch.filename}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[#5f5750]">
                        新增 {batch.inserted} · 更新 {batch.updated} · 跳过{" "}
                        {batch.skipped}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-[#d8d0c8] p-6 text-center text-xs text-[#918981]">
              还没有导入记录。
            </div>
          )}
        </CardContent>
      </Card>
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
