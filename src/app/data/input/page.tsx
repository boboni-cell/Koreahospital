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

// 目标字段定义（录入用）
const FIELDS: { key: string; label: string; kind: "date" | "text" | "num" | "accId" }[] = [
  { key: "date", label: "日期", kind: "date" },
  { key: "platform", label: "平台", kind: "text" },
  { key: "handle", label: "账号", kind: "text" },
  { key: "account_id", label: "账号ID", kind: "accId" },
  { key: "followers", label: "粉丝数", kind: "num" },
  { key: "views", label: "播放/浏览", kind: "num" },
  { key: "likes", label: "点赞", kind: "num" },
  { key: "saves", label: "收藏", kind: "num" },
  { key: "comments", label: "评论", kind: "num" },
  { key: "shares", label: "分享", kind: "num" },
];
const NUM_KEYS = FIELDS.filter((f) => f.kind === "num").map((f) => f.key);

function autoDetectCol(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  return lower.findIndex((h) => names.some((n) => h.includes(n) || n.includes(h)));
}

export default function DataInputPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ followers: 0, likes: 0, saves: 0, comments: 0, shares: 0, views: 0 });
  const [saving, setSaving] = useState(false);

  // 批量录入：粘贴 / 上传 共用一套解析 + 列映射
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  // 解析粘贴/文件文本 -> 表格 + 自动列映射
  function ingest(text: string) {
    if (!text.trim()) { setParsed(null); setRawText(""); return; }
    try {
      const p = parseCsv(text);
      if (p.headers.length === 0) { toast.error("未识别到表头，请确认首行是列名"); return; }
      const m: Record<string, number> = {};
      m.date = autoDetectCol(p.headers, "date", "日期");
      m.platform = autoDetectCol(p.headers, "platform", "平台");
      m.handle = autoDetectCol(p.headers, "handle", "账号", "号");
      m.account_id = autoDetectCol(p.headers, "account_id", "账号id", "id");
      for (const k of NUM_KEYS) {
        m[k] = autoDetectCol(
          p.headers,
          k,
          k === "followers" ? "粉丝" : k === "views" ? "播放" : k === "likes" ? "点赞" : k === "saves" ? "收藏" : k === "comments" ? "评论" : "分享"
        );
      }
      setParsed(p);
      setRawText(text);
      setMapping(m);
      setUploadMsg("");
    } catch {
      toast.error("解析失败，请检查格式（支持 CSV / 表格粘贴）");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result || ""));
    reader.readAsText(f, "utf-8");
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // 用户从 Excel/Sheets 复制后粘贴，浏览器给的是 \t 分隔文本
    const text = e.clipboardData.getData("text");
    if (text.trim()) { ingest(text); }
  }

  function applyMappingAndUpload() {
    if (!parsed) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const { headers, rows } = parsed;
      const out = rows
        .map((r) => {
          const row: Record<string, any> = {};
          for (const f of FIELDS) {
            const ci = mapping[f.key] ?? -1;
            row[f.key] = ci >= 0 ? (r[ci] ?? "").trim() : f.kind === "num" ? 0 : "";
          }
          return row;
        })
        .filter((r) => r.date || r.account_id || r.handle);
      fetch("/api/metrics/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: out }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) {
            setUploadMsg(`成功录入 ${res.inserted} 行，跳过 ${res.skipped} 行（无匹配账号/无日期）`);
            toast.success(`已分析并录入 ${res.inserted} 行`);
            setRawText(""); setParsed(null); setMapping({});
          } else toast.error(res.error || "上传失败");
        })
        .catch((e) => toast.error("上传失败：" + (e?.message || "")))
        .finally(() => setUploading(false));
    } catch (e: any) {
      toast.error("处理失败：" + (e?.message || ""));
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
              {FIELDS.filter((f) => f.kind === "num").map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Input type="number" value={(form as any)[f.key]} onChange={(e) => set(f.key as keyof typeof form, e.target.value)} />
                </div>
              ))}
            </div>
            <Button onClick={save} disabled={saving} className="bg-zinc-900 hover:bg-zinc-700">
              {saving ? "录入中" : "录入数据"}
            </Button>
          </CardContent>
        </Card>

        {/* 批量：粘贴 / 上传 + 列映射 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>批量录入（粘贴 Excel / 上传 CSV）</span>
              <button onClick={downloadTemplate} className="text-xs text-rose-500 hover:underline">下载模板</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-400">
              方式一：从 Excel / 飞书 / Google Sheets 直接复制表格，粘贴到下方文本框；方式二：上传 CSV 文件。系统自动识别列，识别不准时可在下面手动指定。
            </p>
            <textarea
              ref={taRef}
              onPaste={onPaste}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="在此粘贴从表格复制的数据（首行为列名）…"
              className="h-28 w-full resize-none rounded-lg border border-zinc-200 p-2 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">或</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.xlsx"
                onChange={onFile}
                className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-zinc-700"
              />
            </div>

            {parsed && (
              <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                <p className="text-xs font-medium text-zinc-600">列映射（自动识别，可手动改）</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-[11px] text-zinc-500">{f.label}</Label>
                      <Select
                        value={mapping[f.key] != null && mapping[f.key] >= 0 ? String(mapping[f.key]) : "none"}
                        onValueChange={(v) => setMapping((p) => ({ ...p, [f.key]: v === "none" ? -1 : Number(v) }))}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">（不使用）</SelectItem>
                          {parsed.headers.map((h, i) => (
                            <SelectItem key={i} value={String(i)}>{h || `列${i + 1}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="max-h-44 overflow-auto rounded-lg border border-zinc-100 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-50">
                      <tr>
                        {parsed.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1 text-left font-medium text-zinc-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 6).map((r, ri) => (
                        <tr key={ri} className="border-t border-zinc-50">
                          {r.map((c, ci) => (
                            <td key={ci} className="px-2 py-1 text-zinc-700">{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-400">预览前 {Math.min(parsed.rows.length, 6)} / 共 {parsed.rows.length} 行</p>
                <Button onClick={applyMappingAndUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-500">
                  {uploading ? "录入中…" : `分析并录入 ${parsed.rows.length} 行`}
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
