"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * 工作台总控 Agent 的 system prompt 配置。
 * 用户可自定义，决定 agent 如何为任务分配模型类型 / skill / 步骤。
 */
export function AgentConfigForm() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/agent-config")
      .then((r) => r.json())
      .then((d) => setPrompt(d.systemPrompt ?? ""))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/agent-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt }),
      });
      if (r.ok) toast.success("Agent 总控 system prompt 已保存");
      else toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4" /> Agent 总控（工作台编排）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-400">
          总控 Agent 的 system prompt。它根据用户任务，判断该用哪类模型（文本/图片/视频）、调用哪些
          skill、给出执行步骤。保存后所有编排请求都会用它。
        </p>
        <div className="space-y-1">
          <Label>System Prompt</Label>
          <textarea
            value={loading ? "加载中…" : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            className="w-full rounded-xl border border-[#e4e0e6] bg-white px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <a href="/settings/models" className="text-xs text-rose-500 hover:underline">
            前往配置模型 →
          </a>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
