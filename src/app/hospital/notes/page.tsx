"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const CHANNEL_HINT = "微信 / 抖音 / 小红书 / 邮件 / 电话 / Instagram / TikTok / YouTube / Kakao / 官网 / 其他";

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

  async function del(id: number) {
    if (!confirm("确认删除这条沟通记录？")) return;
    const r = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("已删除");
      load();
    } else toast.error("删除失败");
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
              <Input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={CHANNEL_HINT}
                list="channel-suggest"
              />
              <datalist id="channel-suggest">
                <option value="微信" />
                <option value="抖音" />
                <option value="小红书" />
                <option value="邮件" />
                <option value="电话" />
                <option value="Instagram" />
                <option value="TikTok" />
                <option value="YouTube" />
                <option value="Kakao" />
                <option value="官网" />
                <option value="其他" />
              </datalist>
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{n.created_at?.slice(0, 10)}</span>
                    <button
                      onClick={() => del(n.id)}
                      aria-label="删除"
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 删除
                    </button>
                  </div>
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
