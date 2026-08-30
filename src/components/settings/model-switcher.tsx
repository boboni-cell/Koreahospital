"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Model {
  id: string;
  name: string;
  kind: "text" | "image" | "video";
  model: string;
  isActive: boolean;
}

/**
 * 一键切换某类（图像/视频/文本）正在使用的模型。
 * 切换后自动调 /api/models/active 写入 data/models.json，无需重新填任何配置。
 */
export function ModelSwitcher({
  kind,
  activeName,
  onChange,
}: {
  kind: "text" | "image" | "video";
  activeName?: string;
  onChange?: () => void;
}) {
  const [models, setModels] = useState<Model[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d: Model[]) => setModels(d.filter((m) => m.kind === kind)))
      .catch(() => {});
  }, [kind]);

  const value = models.find((m) => m.isActive)?.id ?? "";

  async function switchActive(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/models/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        toast.success("已切换启用模型");
        onChange?.();
        // 刷新本组件列表
        const d = await fetch("/api/models").then((x) => x.json());
        setModels((d as Model[]).filter((m) => m.kind === kind));
      } else toast.error("切换失败");
    } catch {
      toast.error("切换失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => v && switchActive(v)} disabled={busy}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}（{m.model}）{m.isActive ? " · 使用中" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {models.length === 0 && (
        <a href="/settings/models" className="text-xs text-rose-500 hover:underline">去添加→</a>
      )}
      {busy && <Loader2 className="h-4 w-4 animate-spin text-stone-400" />}
    </div>
  );
}
