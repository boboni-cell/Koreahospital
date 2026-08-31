"use client";

import { useEffect, useRef, useState } from "react";
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
import { parseCsv, toCsv } from "@/lib/csv";

interface Account {
  id: number;
  platform: string;
  handle: string;
}

const NUM_FIELDS = [
  ["followers", "粉丝数"],
  ["views", "播放/浏览"],
  ["likes", "点赞"],
  ["saves", "收藏"],
  ["comments", "评论"],
  ["shares", "分享"],
] as const;

export default function DataInputPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ followers: 0, likes: 0, saves: 0, comments: 0, shares: 0, views: 0 });
  const [saving, setSaving] = useState(false);

  // CSV 上传状态
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((d: Account[]) => {
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

  // —— CSV 上传 / 解析 / 分析 ——
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(f, "utf-8");
  }

  useEffect(() => {
    if (!csvText.trim()) { setCsvPreview(null); return; }
    try {
      setCsvPreview(parseCsv(csvText));
    } catch {
      setCsvPreview(null);
      toast.error("CSV 解析失败，请检查格式");
    }
  }, [csvText]);

  async function uploadCsv() {
    if (!csvPreview) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const { headers, rows } = csvPreview;
      const lower = headers.map((h) => h.toLowerCase());
      // 自动识别列：date/日期, platform/平台, handle/账号, 以及各数值字段
      const col = (...names: string[]) => lower.findIndex((h) => names.some((n) => h.includes(n) || n.includes(h)));
      const iDate = col("date", "日期");
      const iPlatform = col("platform", "平台");
      const iHandle = col("handle", "账号", "号");
      const pick = (name: string) => col(name.toLowerCase());
      const idx: Record<string, number> = {};
      for (const [f] of NUM_FIELDS) idx[f] = col(f, f === "followers" ? "粉丝" : f === "views" ? "播放" : f === "likes" ? "点赞" : f === "saves" ? "收藏" : f === "comments" ? "评论" : "分享");
      const iAccId = col("account_id", "账号id", "id");

      const out = rows
        .map((r) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
          const row: Record<string, any> = { date: iDate >= 0 ? r[iDate] : "" };
          if (iAccId >= 0) row.account_id = r[iAccId];
          if (iPlatform >= 0) row.platform = r[iPlatform];
          if (iHandle >= 0) row.handle = r[iHandle];
          for (const [f] of NUM_FIELDS) row[f] = idx[f] >= 0 ? r[idx[f]] : 0;
          return row;
        })
        .filter((r) => r.date || r.account_id || r.handle);

      const res = await fetch("/api/metrics/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: out }),
      }).then((r) => r.json());
      if (res.ok) {
        setUploadMsg(`成功录入 ${res.inserted} 行，跳过 ${res.skipped} 行（无匹配账号/无日期）`);
        toast.success(`已分析并录入 ${res.inserted} 行`);
        setCsvText("");
      } else toast.error(res.error || "上传失败");
    } catch (e: any) {
      toast.error("上传失败：" + (e?.message || ""));
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const csv = toCsv(
      ["date", "platform", "handle", "followers", "views", "likes", "saves", "comments", "shares"],
      [
        ["2026-09-01", "xiaohongshu", "院长号", "12000", "3000", "450", "120", "30", "25"],
        ["2026-09-01", "douyin", "院长号", "8000", "5000", "600", "90", "40", "30"],
      ]
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "运营数据模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">数据录入</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 手动录入 */}
        <Card>
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
              {NUM_FIELDS.map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label>{label}</Label>
                  <Input type="number" value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
            <Button onClick={save} disabled={saving} className="bg-zinc-900 hover:bg-zinc-700">
              {saving ? "录入中" : "录入数据"}
            </Button>
          </CardContent>
        </Card>

        {/* CSV 上传 + 分析 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>上传 CSV / 表格批量分析</span>
              <button onClick={downloadTemplate} className="text-xs text-rose-500 hover:underline">下载模板</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-400">
              支持各平台导出的数据表（如抖音/小红书创作者后台 CSV）。自动识别 日期 / 平台 / 账号 / 粉丝 / 播放 / 点赞 等列，按账号+日期去重入库。
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={onFile}
              className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-zinc-700"
            />
            {csvPreview && (
              <div className="space-y-2">
                <div className="max-h-56 overflow-auto rounded-lg border border-zinc-100">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50">
                      <tr>
                        {csvPreview.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1 text-left font-medium text-zinc-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.slice(0, 8).map((r, ri) => (
                        <tr key={ri} className="border-t border-zinc-50">
                          {r.map((c, ci) => (
                            <td key={ci} className="px-2 py-1 text-zinc-700">{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-400">
                  预览前 {Math.min(csvPreview.rows.length, 8)} / 共 {csvPreview.rows.length} 行
                </p>
                <Button onClick={uploadCsv} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-500">
                  {uploading ? "分析中…" : `分析并录入 ${csvPreview.rows.length} 行`}
                </Button>
                {uploadMsg && <p className="text-xs text-emerald-600">{uploadMsg}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
