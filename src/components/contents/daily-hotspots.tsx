"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { HotspotItem } from "@/lib/daily-hotspots";

interface Source { id: string; name: string; items: HotspotItem[]; error: string | null }

const sourceStyles: Record<string, { icon: string; color: string; tint: string }> = {
  rednote: { icon: "https://www.xiaohongshu.com/favicon.ico", color: "#ff2442", tint: "#fff0f2" },
  weibo: { icon: "https://weibo.com/favicon.ico", color: "#e6162d", tint: "#fff1f1" },
  douyin: { icon: "https://www.douyin.com/favicon.ico", color: "#161823", tint: "#f2f2f3" },
  toutiao: { icon: "https://www.toutiao.com/favicon.ico", color: "#f04142", tint: "#fff1f1" },
  zhihu: { icon: "https://www.zhihu.com/favicon.ico", color: "#1772f6", tint: "#eef5ff" },
};

function SourceLogo({ id, name }: { id: string; name: string }) {
  const style = sourceStyles[id];
  return <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/[.05] bg-white shadow-sm">
    {style ? <img src={style.icon} alt={`${name} Logo`} className="h-5 w-5 object-contain" /> : <span className="text-xs font-semibold">{name[0]}</span>}
  </span>;
}

export function DailyHotspots() {
  const [sources, setSources] = useState<Source[]>([]);
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState("");
  const [trendQuery, setTrendQuery] = useState("");
  const [researching, setResearching] = useState("");

  async function load(query = "", refresh = false) {
    if (!query) setActive("all");
    setLoading(true);
    try {
      const params = query ? `?provider=trendaradar&trend_query=${encodeURIComponent(query)}${refresh ? "&refresh=1" : ""}` : "";
      const response = await fetch(`/api/hotspots${params}`);
      const data = await response.json();
      setSources(data.sources || []);
      setFetchedAt(data.fetchedAt || "");
    } catch { toast.error("每日热点加载失败"); }
    finally { setLoading(false); }
  }

  async function collectResearch(item: HotspotItem) {
    if (!item.link) return toast.error("该热点没有可采集的原文链接");
    setResearching(item.link);
    try {
      const response = await fetch("/api/agent/research/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: item.link }) });
      const data = await response.json();
      if (!response.ok) return toast.error(data.error || "研究资料采集失败");
      toast.success(`已保存研究资料任务 #${data.taskId}`);
    } catch { toast.error("研究资料采集失败"); }
    finally { setResearching(""); }
  }

  useEffect(() => { load(); }, []);
  const items = useMemo(() => sources.flatMap((source) => source.items.map((item) => ({ ...item, sourceId: source.id, sourceName: source.name }))).filter((item) => active === "all" || item.sourceId === active), [sources, active]);
  useEffect(() => {
    const context = items.slice(0, 30).map((item) => `${item.sourceName} #${item.rank} ${item.title}${item.hotValue ? ` 热度${item.hotValue}` : ""}${item.link ? ` ${item.link}` : ""}`).join("\n");
    window.dispatchEvent(new CustomEvent("toni:context", { detail: { pathname: "/contents/hotspots", context } }));
  }, [items]);

  function askToni(item: HotspotItem & { sourceName: string }) {
    window.dispatchEvent(new CustomEvent("toni:compose", { detail: { text: `请阅读当前每日热点页面，并根据${item.sourceName}热点「${item.title}」结合 Koreahospital 项目背景，先提出 5 个合规内容选题和切入角度，不要直接生成发布内容。来源：${item.link || "60s API"}` } }));
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">Content production · Daily trends</p><h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">每日热点</h2><p className="mt-1 text-sm text-[#817a73]">浏览多平台实时热点，自己构思，或交给 Toni 生成待采纳选题。</p></div><Button variant="outline" onClick={() => active === "trendaradar" && trendQuery.trim() ? load(trendQuery.trim(), true) : load("", true)} disabled={loading}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> 刷新</Button></div>
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#e8e1da] bg-white/70 p-2 shadow-[0_8px_30px_rgba(53,45,38,.04)]"><Button size="sm" variant={active === "all" ? "default" : "outline"} onClick={() => setActive("all")} className="h-10 rounded-xl px-4">全部榜单</Button>{sources.map((source) => { const style = sourceStyles[source.id]; return <button key={source.id} type="button" onClick={() => setActive(source.id)} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition-all ${active === source.id ? "border-transparent font-medium shadow-sm" : "border-transparent text-[#68615b] hover:border-[#ded6cf] hover:bg-white"}`} style={active === source.id && style ? { background: style.tint, color: style.color } : undefined}><SourceLogo id={source.id} name={source.name} /><span>{source.name}</span><span className="rounded-full bg-black/[.06] px-1.5 py-0.5 text-[10px] tabular-nums">{source.items.length}</span></button>; })}<div className="ml-auto flex w-full gap-2 sm:w-auto"><Input value={trendQuery} onChange={(e) => setTrendQuery(e.target.value)} placeholder="TrendRadar 关键词（可选）" className="h-10 w-full sm:w-56" /><Button size="sm" variant="outline" onClick={() => { if (!trendQuery.trim()) return toast.error("请输入 TrendRadar 关键词"); setActive("trendaradar"); load(trendQuery.trim(), true); }}>筛选趋势</Button></div></div>
    {sources.some((source) => source.error) && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">部分来源暂不可用：{sources.filter((source) => source.error).map((source) => source.name).join("、")}。{sources.some((source) => source.error && source.id !== "trendaradar") ? "60s 官方公共实例有每日额度，可通过 SIXTY_SECONDS_API_BASE 切换自建实例。" : "请检查对应 provider 的本地配置或服务状态。"}</div>}
    {loading ? <div className="flex items-center justify-center py-20 text-sm text-[#89828d]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在读取热点…</div> : items.length ? <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => { const style = sourceStyles[item.sourceId]; const topThree = item.rank <= 3; return <div key={`${item.sourceId}-${item.rank}-${item.title}`} className="group grid grid-cols-[44px_1fr] gap-3 rounded-2xl border border-[#e4ddd6] bg-white px-4 py-4 shadow-[0_10px_35px_rgba(53,45,38,.055)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(53,45,38,.09)] sm:grid-cols-[44px_40px_1fr] sm:px-5">
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold tabular-nums ${topThree ? "text-white shadow-sm" : "bg-[#f3efeb] text-[#77706a]"}`} style={topThree ? { background: item.rank === 1 ? "linear-gradient(135deg,#f4b740,#e98724)" : item.rank === 2 ? "linear-gradient(135deg,#aeb8c3,#7f8b98)" : "linear-gradient(135deg,#c99470,#9d6848)" } : undefined}>{item.rank}</span>
      <div className="hidden sm:block"><SourceLogo id={item.sourceId} name={item.sourceName} /></div>
      <div className="min-w-0"><div className="flex items-center gap-2 sm:hidden"><SourceLogo id={item.sourceId} name={item.sourceName} /><span className="text-xs text-[#817a73]">{item.sourceName}</span></div><h3 className={`mt-1 leading-snug text-[#211e1c] sm:mt-0 ${topThree ? "text-base font-semibold" : "font-medium"}`}>{item.title}</h3>{item.detail && <p className="mt-1 line-clamp-1 text-xs text-[#817a73]">{item.detail}</p>}<div className="mt-2 flex items-center gap-2 text-xs"><span className="text-[#918a84]">{item.sourceName}</span>{item.hotValue && <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: style?.color || "#f43f5e", background: style?.tint || "#fff1f2" }}>🔥 {item.hotValue}</span>}</div></div>
      <div className="col-start-2 flex flex-wrap gap-2 sm:col-span-2 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100">{item.link && <a href={item.link} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /> 来源</Button></a>}{item.link && <Button size="sm" variant="outline" onClick={() => collectResearch(item)} disabled={researching === item.link}>{researching === item.link ? "采集中" : "采集研究资料"}</Button>}<Button size="sm" onClick={() => askToni(item)}><Sparkles className="h-3.5 w-3.5" /> Toni 想选题</Button></div>
    </div>; })}</div> : <div className="rounded-xl border border-dashed p-12 text-center text-sm text-[#89828d]">{active === "trendaradar" && trendQuery.trim() ? `TrendRadar 暂未找到“${trendQuery.trim()}”的匹配热点，请换一个关键词。` : "当前没有可用热点，请稍后刷新或配置自建 60s API。"}</div>}
    {fetchedAt && <p className="text-right text-[11px] text-[#a19a94]">数据源：{active === "trendaradar" ? "TrendRadar" : "vikiboss/60s"} · 更新时间 {new Date(fetchedAt).toLocaleString("zh-CN")}</p>}
  </div>;
}
