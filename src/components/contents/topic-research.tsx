"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Loader2, ExternalLink, Database } from "lucide-react";
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
import { PLATFORMS } from "@/lib/constants";

interface Topic {
  title: string;
  heat: number;
  angle: string;
  why: string;
  contentType?: "image" | "video";
}

export function TopicResearch() {
  const [niche, setNiche] = useState("发际线种植");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [goal, setGoal] = useState("涨粉");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [note, setNote] = useState("");
  const [modelPowered, setModelPowered] = useState(true);
  const [engine, setEngine] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ id: number; keywords: string; status: string; progress: number; error: string | null }[]>([]);

  const loadTasks = useCallback(() => fetch("/api/agent/research/collect").then((r) => r.json()).then(setTasks).catch(() => setTasks([])), []);
  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => {
    if (!tasks.some((task) => task.status === "pending" || task.status === "running")) return;
    const timer = setInterval(loadTasks, 2000);
    return () => clearInterval(timer);
  }, [tasks, loadTasks]);

  async function collect() {
    const r = await fetch("/api/agent/research/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keywords: `${niche} ${goal}` }) });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "热点采集创建失败");
    toast.success(`热点采集任务 #${d.taskId} 已创建，搜索词已润色为「${d.refinedKeywords}」`);
    await loadTasks();
  }

  async function syncFeishu(id: number) {
    const r = await fetch(`/api/agent/research/collect/${id}/feishu`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "同步飞书失败");
    toast.success(`已同步 ${d.count} 条研究数据到飞书`);
    if (d.docUrl) window.open(d.docUrl, "_blank");
  }

  async function adopt(t: Topic) {
   fetch("/api/topics", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       title: t.title,
       description: `${t.angle}｜${t.why}`,
       source: "adopted",
       heat_score: t.heat,
     }),
   })
     .then(() => toast.success("已采纳到选题池"))
     .catch(() => toast.error("采纳失败"));
 }

 async function run() {
   setLoading(true);
    try {
      const r = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platform, goal }),
      });
      const d = await r.json();
      setModelPowered(d.modelPowered !== false);
      setTopics(d.topics ?? []);
      setNote(d.note ?? "");
      setEngine(d.engine ?? null);
      if (d.modelPowered === false) toast.warning("模型未配置，展示模板选题");
    } catch (e) {
      toast.error("请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-rose-400" />
        <h2 className="text-xl font-semibold tracking-tight text-[#01011b]">选题研究</h2>
        {!modelPowered && <span className="pill bg-[#ecedf2] text-[#717a94]">模板模式</span>}
        {modelPowered && engine && (
          <span className="pill bg-emerald-50 text-emerald-600">{engine} 检索</span>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <Label>方向</Label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="如 发际线种植" />
          </div>
          <div className="space-y-1">
            <Label>平台</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v ?? "xiaohongshu")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>目标</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="如 涨粉" />
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "研究中" : "生成选题"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> 热点采集与研究历史</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#89828d]">这里负责公开热点与来源采集；数据中心只保留运营数据与复盘。</p><Button variant="outline" onClick={collect}>采集当前方向热点</Button></div>
          {tasks.length === 0 ? <p className="text-sm text-[#89828d]">暂无采集历史</p> : tasks.slice(0, 8).map((task) => (
            <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8e1da] p-3 text-sm">
              <div><span className="font-medium">#{task.id} {task.keywords}</span><span className="ml-2 text-xs text-[#89828d]">{task.status === "completed" ? `已完成 ${task.progress} 条` : task.status === "failed" ? task.error || "失败" : "采集中"}</span></div>
              {task.status === "completed" && <div className="flex gap-2"><a href={`/api/agent/research/collect/${task.id}/export?format=md`} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"><ExternalLink className="h-3 w-3" /> 查看报告</a><Button size="sm" onClick={() => syncFeishu(task.id)}>同步研究结果到飞书</Button></div>}
            </div>
          ))}
        </CardContent>
      </Card>

      {topics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((t, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t.title}</span>
                  <span className="flex items-center gap-1">
                    {t.contentType && (
                      <span className={`pill ${t.contentType === "video" ? "bg-violet-100 text-violet-600" : "bg-rose-100 text-rose-600"}`}>
                        {t.contentType === "video" ? "视频" : "图文"}
                      </span>
                    )}
                    <span className="pill bg-rose-400 text-white">热度 {t.heat}</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-[#89828d]">切入点：</span>
                  {t.angle}
                </div>
                <div>
                  <span className="text-[#89828d]">推荐理由：</span>
                  {t.why}
                </div>
                <div className="pt-1">
                  <Button size="sm" variant="outline" onClick={() => adopt(t)}>
                    采纳选题
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {note && <p className="text-xs text-zinc-400">{note}</p>}
    </div>
  );
}
