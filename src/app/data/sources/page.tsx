"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Source {
  id: number;
  name: string;
  kind: string;
  platform: string | null;
  url: string | null;
  keywords: string | null;
  category: string | null;
  credibility: string;
  last_checked_at: string | null;
  status: string;
  signals_count: number;
}
interface Signal {
  id: number;
  source_id: number | null;
  source_name: string | null;
  platform: string | null;
  source_url: string | null;
  title: string;
  evidence: string | null;
  status: string;
  created_at: string;
}
const CATEGORIES = [
  "官方平台",
  "竞品账号",
  "行业媒体",
  "医院／医生",
  "关键词／话题",
  "自定义分类",
];
const PLATFORM: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  web: "网站",
};
const CREDIBILITY: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export default function SourcesPage() {
  const [tab, setTab] = useState("sources");
  const [sources, setSources] = useState<Source[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [query, setQuery] = useState("");
  const [sourceForm, setSourceForm] = useState({
    name: "",
    category: "竞品账号",
    platform: "xiaohongshu",
    url: "",
    keywords: "",
    credibility: "medium",
  });
  const [signalForm, setSignalForm] = useState({
    source_id: "",
    platform: "xiaohongshu",
    source_url: "",
    title: "",
    evidence: "",
  });
  const load = () =>
    Promise.all([
      fetch("/api/signal-sources").then((response) => response.json()),
      fetch("/api/signals").then((response) => response.json()),
    ]).then(([sourceRows, signalRows]) => {
      setSources(sourceRows);
      setSignals(signalRows);
    });
  useEffect(() => {
    load();
  }, []);

  async function addSource() {
    const response = await fetch("/api/signal-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...sourceForm,
        kind: sourceForm.category === "关键词／话题" ? "keyword" : "source",
      }),
    });
    if (response.ok) {
      toast.success("信息源已保存");
      setSourceForm({ ...sourceForm, name: "", url: "", keywords: "" });
      load();
    } else toast.error("保存失败");
  }
  async function markChecked(id: number) {
    await fetch("/api/signal-sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "checked" }),
    });
    toast.success("已记录本次人工检查");
    load();
  }
  async function removeSource(id: number) {
    if (!confirm("确认删除这条信息源？已采集的信号会保留（来源字段置空）。")) return;
    const r = await fetch(`/api/signal-sources?id=${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除信息源");
      load();
    } else toast.error("删除失败");
  }
  async function addSignal() {
    if (!signalForm.title.trim()) return toast.error("请填写信号标题");
    const response = await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signalForm),
    });
    if (response.ok) {
      toast.success("已进入待确认收件箱");
      setSignalForm({ ...signalForm, title: "", source_url: "", evidence: "" });
      load();
    }
  }
  async function decide(id: number, status: string) {
    await fetch("/api/signals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }
  async function removeSignal(id: number) {
    if (!confirm("确认删除这条信号？")) return;
    const r = await fetch(`/api/signals?id=${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除信号");
      load();
    } else toast.error("删除失败");
  }
  const filteredSources = sources.filter(
    (source) =>
      !query ||
      [source.name, source.url, source.keywords].some((value) =>
        value?.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  const filteredSignals = signals.filter(
    (signal) =>
      !query ||
      [signal.title, signal.source_name, signal.source_url].some((value) =>
        value?.toLowerCase().includes(query.toLowerCase()),
      ),
  );

  return (
    <PageFrame>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">
            Data center · Sources
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
            信息源
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            管理长期关注来源；采集到的内容先进入人工确认收件箱。
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#918981]" />
          <Input
            className="w-64 bg-white pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索来源或信号"
          />
        </div>
      </div>
      <div className="mb-5 inline-flex rounded-full bg-[#e9e3dc] p-1">
        <button
          onClick={() => setTab("sources")}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === "sources" ? "bg-[#171619] text-white" : "text-[#716961]"}`}
        >
          来源管理 {sources.length}
        </button>
        <button
          onClick={() => setTab("signals")}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === "signals" ? "bg-[#171619] text-white" : "text-[#716961]"}`}
        >
          信号收件箱{" "}
          {signals.filter((signal) => signal.status === "pending").length}
        </button>
      </div>

      {tab === "sources" ? (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card className="border-[#e2dcd5] bg-[#fffefa]">
            <CardContent className="space-y-3 p-5">
              <div>
                <Plus className="h-5 w-5 text-[#796da1]" />
                <h3 className="mt-2 font-semibold text-[#2d2926]">
                  新增信息源
                </h3>
                <p className="text-xs text-[#918981]">
                  人工触发只读检查，不自动登录或批量抓取。
                </p>
              </div>
              <Field label="来源名称">
                <Input
                  value={sourceForm.name}
                  onChange={(event) =>
                    setSourceForm({ ...sourceForm, name: event.target.value })
                  }
                  placeholder="例如：竞品院长账号"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="分类">
                  <Select
                    value={sourceForm.category}
                    onValueChange={(value) =>
                      setSourceForm({
                        ...sourceForm,
                        category: value ?? "竞品账号",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{sourceForm.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="平台">
                  <Select
                    value={sourceForm.platform}
                    onValueChange={(value) =>
                      setSourceForm({
                        ...sourceForm,
                        platform: value ?? "xiaohongshu",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{PLATFORM[sourceForm.platform]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xiaohongshu">小红书</SelectItem>
                      <SelectItem value="douyin">抖音</SelectItem>
                      <SelectItem value="web">网站</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="主页或网站 URL">
                <Input
                  value={sourceForm.url}
                  onChange={(event) =>
                    setSourceForm({ ...sourceForm, url: event.target.value })
                  }
                />
              </Field>
              <Field label="关注关键词">
                <Input
                  value={sourceForm.keywords}
                  onChange={(event) =>
                    setSourceForm({
                      ...sourceForm,
                      keywords: event.target.value,
                    })
                  }
                  placeholder="植发, 发际线, 院长IP"
                />
              </Field>
              <Field label="可信度">
                <Select
                  value={sourceForm.credibility}
                  onValueChange={(value) =>
                    setSourceForm({
                      ...sourceForm,
                      credibility: value ?? "medium",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{CREDIBILITY[sourceForm.credibility]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button onClick={addSource} className="w-full">
                <Plus className="h-4 w-4" /> 保存来源
              </Button>
            </CardContent>
          </Card>
          <div className="grid content-start gap-3 md:grid-cols-2">
            {filteredSources.map((source) => (
              <Card key={source.id} className="border-[#e2dcd5] bg-[#fffefa]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-[#eee8ff] text-[#665a86]">
                        {source.category}
                      </Badge>
                      <h3 className="mt-2 font-semibold text-[#302b28]">
                        {source.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#918981]">
                        {PLATFORM[source.platform ?? ""] ??
                          source.platform ??
                          "—"}{" "}
                        · 可信度{" "}
                        {source.credibility === "high"
                          ? "高"
                          : source.credibility === "low"
                            ? "低"
                            : "中"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSource(source.id)}
                      className="text-[#aaa29b] hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center gap-1 truncate text-xs text-[#665a86]"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[#ece6df] pt-3 text-[11px] text-[#817a73]">
                    <span>
                      {source.signals_count} 条信号 ·{" "}
                      {source.last_checked_at
                        ? `上次 ${source.last_checked_at.slice(0, 10)}`
                        : "尚未检查"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markChecked(source.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> 人工检查
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!filteredSources.length && (
              <div className="col-span-full rounded-[20px] border border-dashed border-[#d8d0c8] p-10 text-center text-sm text-[#918981]">
                还没有信息源，从左侧新增第一条。
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card className="border-[#e2dcd5] bg-[#fffefa]">
            <CardContent className="space-y-3 p-5">
              <Inbox className="h-5 w-5 text-[#796da1]" />
              <h3 className="font-semibold text-[#2d2926]">人工添加信号</h3>
              <Field label="关联来源">
                <Select
                  value={signalForm.source_id}
                  onValueChange={(value) => {
                    const source = sources.find(
                      (row) => String(row.id) === value,
                    );
                    setSignalForm({
                      ...signalForm,
                      source_id: value ?? "",
                      platform: source?.platform ?? signalForm.platform,
                      source_url: source?.url ?? signalForm.source_url,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {sources.find((source) => String(source.id) === signalForm.source_id)?.name ?? "选择来源"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={String(source.id)}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="平台">
                <Select
                  value={signalForm.platform}
                  onValueChange={(value) =>
                    setSignalForm({
                      ...signalForm,
                      platform: value ?? "xiaohongshu",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{PLATFORM[signalForm.platform]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xiaohongshu">小红书</SelectItem>
                    <SelectItem value="douyin">抖音</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="标题">
                <Input
                  value={signalForm.title}
                  onChange={(event) =>
                    setSignalForm({ ...signalForm, title: event.target.value })
                  }
                />
              </Field>
              <Field label="来源 URL">
                <Input
                  value={signalForm.source_url}
                  onChange={(event) =>
                    setSignalForm({
                      ...signalForm,
                      source_url: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="证据摘要">
                <Textarea
                  value={signalForm.evidence}
                  onChange={(event) =>
                    setSignalForm({
                      ...signalForm,
                      evidence: event.target.value,
                    })
                  }
                />
              </Field>
              <Button onClick={addSignal} className="w-full">
                <Plus className="h-4 w-4" /> 加入待确认
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {filteredSignals.map((signal) => (
              <Card
                key={signal.id}
                className={`border-[#e2dcd5] ${signal.status === "pending" ? "bg-[#fff6df]" : "bg-[#fffefa]"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            signal.status === "confirmed"
                              ? "bg-[#dff4e8] text-[#35684d]"
                              : signal.status === "rejected"
                                ? "bg-[#ece7e2] text-[#756e67]"
                                : "bg-[#fae1a6] text-[#7a571c]"
                          }
                        >
                          {signal.status === "confirmed"
                            ? "已确认"
                            : signal.status === "rejected"
                              ? "已驳回"
                              : "待确认"}
                        </Badge>
                        <span className="text-[11px] text-[#817a73]">
                          {signal.source_name ?? "未关联来源"} ·{" "}
                          {PLATFORM[signal.platform ?? ""] ?? signal.platform}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold text-[#302b28]">
                        {signal.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#817a73]">
                        {signal.evidence || "暂无证据摘要"}
                      </p>
                      {signal.source_url && (
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block max-w-xl truncate text-[11px] text-[#665a86]"
                        >
                          {signal.source_url}
                        </a>
                      )}
                    </div>
                    {signal.status === "pending" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => decide(signal.id, "confirmed")}
                        >
                          <Check className="h-3.5 w-3.5" /> 确认
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(signal.id, "rejected")}
                        >
                          <X className="h-3.5 w-3.5" /> 驳回
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => removeSignal(signal.id)}
                        aria-label="删除信号"
                        className="flex items-center gap-1 rounded p-1 text-xs text-[#aaa29b] hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!filteredSignals.length && (
              <div className="rounded-[20px] border border-dashed border-[#d8d0c8] p-10 text-center text-sm text-[#918981]">
                信号收件箱为空。
              </div>
            )}
            <div className="flex items-start gap-2 rounded-[14px] bg-[#e8f2ed] p-3 text-xs text-[#41614f]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              确认后才可进入选题和知识库；系统不会自动登录平台、绕过验证码或无人值守批量采集。
            </div>
          </div>
        </div>
      )}
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
