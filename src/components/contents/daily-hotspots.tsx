"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { HotspotItem } from "@/lib/daily-hotspots";

interface Source { id: string; name: string; items: HotspotItem[]; error: string | null }

export function DailyHotspots() {
  const [sources, setSources] = useState<Source[]>([]);
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/hotspots");
      const data = await response.json();
      setSources(data.sources || []);
      setFetchedAt(data.fetchedAt || "");
    } catch { toast.error("每日热点加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const items = useMemo(() => sources.flatMap((source) => source.items.map((item) => ({ ...item, sourceId: source.id, sourceName: source.name }))).filter((item) => active === "all" || item.sourceId === active), [sources, active]);

  function askToni(item: HotspotItem & { sourceName: string }) {
    window.dispatchEvent(new CustomEvent("toni:compose", { detail: { text: `请阅读当前每日热点页面，并根据${item.sourceName}热点「${item.title}」结合 Koreahospital 项目背景，先提出 5 个合规内容选题和切入角度，不要直接生成发布内容。来源：${item.link || "60s API"}` } }));
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">Content production · Daily trends</p><h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">每日热点</h2><p className="mt-1 text-sm text-[#817a73]">浏览多平台实时热点，自己构思，或交给 Toni 生成待采纳选题。</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> 刷新</Button></div>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant={active === "all" ? "default" : "outline"} onClick={() => setActive("all")}>全部</Button>{sources.map((source) => <Button key={source.id} size="sm" variant={active === source.id ? "default" : "outline"} onClick={() => setActive(source.id)}>{source.name} {source.items.length}</Button>)}</div>
    {sources.some((source) => source.error) && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">部分来源暂不可用：{sources.filter((source) => source.error).map((source) => source.name).join("、")}。官方公共实例有每日额度，可通过 SIXTY_SECONDS_API_BASE 切换自建实例。</div>}
    {loading ? <div className="flex items-center justify-center py-20 text-sm text-[#89828d]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在读取热点…</div> : items.length ? <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <Card key={`${item.sourceId}-${item.rank}-${item.title}`}><CardContent className="flex gap-3 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0ebe5] text-xs font-semibold">{item.rank}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[#8b8179]">{item.sourceName}</span>{item.hotValue && <span className="text-xs text-rose-500">热度 {item.hotValue}</span>}</div><h3 className="mt-1 font-medium text-[#211e1c]">{item.title}</h3>{item.detail && <p className="mt-1 line-clamp-2 text-xs text-[#817a73]">{item.detail}</p>}<div className="mt-3 flex gap-2">{item.link && <a href={item.link} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /> 查看来源</Button></a>}<Button size="sm" onClick={() => askToni(item)}><Sparkles className="h-3.5 w-3.5" /> 让 Toni 想选题</Button></div></div></CardContent></Card>)}</div> : <div className="rounded-xl border border-dashed p-12 text-center text-sm text-[#89828d]">当前没有可用热点，请稍后刷新或配置自建 60s API。</div>}
    {fetchedAt && <p className="text-right text-[11px] text-[#a19a94]">数据源：vikiboss/60s · 更新时间 {new Date(fetchedAt).toLocaleString("zh-CN")}</p>}
  </div>;
}
