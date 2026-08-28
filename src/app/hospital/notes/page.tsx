"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Note {
  id: number;
  patient_name: string | null;
  channel: string;
  content: string;
  summary: string | null;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [patient, setPatient] = useState("");
  const [channel, setChannel] = useState("微信");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await fetch("/api/notes").then((r) => r.json());
    setNotes(d);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!content.trim()) return toast.error("请填写沟通内容");
    setSaving(true);
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_name: patient, channel, content, summary }),
      });
      toast.success("已记录");
      setPatient(""); setContent(""); setSummary("");
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">沟通记录</h2>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>患者/客户</Label>
              <Input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="如 李女士" />
            </div>
            <div className="space-y-1">
              <Label>渠道</Label>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="微信 / 电话 / 面诊" />
            </div>
            <div className="space-y-1">
              <Label>沟通内容</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
            </div>
            <div className="space-y-1">
              <Label>摘要（可选）</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full bg-zinc-900 hover:bg-zinc-700">
              {saving ? "保存中" : "保存记录"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="space-y-1 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-800">
                    {n.patient_name || "匿名"} · {n.channel}
                  </span>
                  <span className="text-xs text-zinc-400">{n.created_at?.slice(0, 10)}</span>
                </div>
                <p className="text-sm text-zinc-600">{n.content}</p>
                {n.summary && <p className="text-xs text-zinc-400">摘要：{n.summary}</p>}
              </CardContent>
            </Card>
          ))}
          {notes.length === 0 && <p className="text-sm text-zinc-400">暂无记录。</p>}
        </div>
      </div>
    </PageFrame>
  );
}
