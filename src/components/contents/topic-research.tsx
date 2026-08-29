"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Loader2 } from "lucide-react";
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
}

export function TopicResearch() {
  const [niche, setNiche] = useState("发际线种植");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [goal, setGoal] = useState("涨粉");
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [note, setNote] = useState("");
  const [modelPowered, setModelPowered] = useState(true);

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
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">选题研究</h2>
        {!modelPowered && <span className="pill bg-stone-100 text-stone-500">模板模式</span>}
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

      {topics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((t, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t.title}</span>
                  <span className="pill bg-rose-400 text-white">热度 {t.heat}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-stone-400">切入点：</span>
                  {t.angle}
                </div>
                <div>
                  <span className="text-stone-400">推荐理由：</span>
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
