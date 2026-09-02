"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CaptainPlanStep {
  text: string;
  status: "pending" | "running" | "done" | "failed";
  role: string;
  result: string | null;
  error: string | null;
  meta?: { provider: string; model: string; latency_ms: number; is_mock: boolean; key_len: number };
}

export interface CaptainPlanPayload {
  planId: number;
  plan: { modelKind: "text" | "image" | "video"; skills: string[]; note: string };
  steps: CaptainPlanStep[];
}

const ROLE_LABEL: Record<string, string> = {
  strategist: "总控", writer: "文案", designer: "设计",
  researcher: "研究", publisher: "发布", analyst: "分析",
};

/**
 * ponytail: 一行 toast 卡片（CaptainProgressBar），宽度由内容自然撑开，
 * 不弹 modal、不抢屏幕。看完整历史去 /plans。
 * 通过 toast 自带的 duration 控制消失时机；用户点 X 立即关。
 */
export function CaptainProgressToast({
  task,
  input,
}: {
  task: string;
  input?: Record<string, any>;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<CaptainPlanPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/agent/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, input: input ?? {}, mode: "orchestrate" }),
        });
        const d = await r.json();
        if (cancelled || !d.planId) return;
        setPayload(d);
        setTotal(d.steps.length);
        setRunning(true);
        for (let i = 0; i < d.steps.length; i++) {
          if (cancelled) return;
          try {
            const rr = await fetch(`/api/agent/plans/${d.planId}/execute-step`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ step_index: i }),
            });
            await rr.json().catch(() => ({}));
            if (cancelled) return;
            setDone((n) => n + 1);
          } catch {
            if (cancelled) return;
            setDone((n) => n + 1);
          }
        }
        setRunning(false);
      } catch {
        if (cancelled) return;
        toast.error("队长连接失败");
      }
    })();
    return () => { cancelled = true; };
  }, [task]);

  if (!task) return null;

  const status: "loading" | "running" | "done" = running ? "running" : payload ? (done >= total && total > 0 ? "done" : "running") : "loading";
  const allSkills = payload?.plan.skills ?? [];
  const skillLine = allSkills.length > 0 ? ` · ${allSkills.length} skill` : "";

  return (
    <div
      className={
        "pointer-events-auto flex w-fit max-w-[min(90vw,720px)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm backdrop-blur transition " +
        (status === "loading"
          ? "border-[#cbd8f1] bg-white/95 text-[#3d4f7a]"
          : status === "running"
            ? "border-[#fae7bf] bg-[#fffbef]/95 text-[#7a571c]"
            : "border-[#c8e6d4] bg-[#f0fbf4]/95 text-[#35684d]")
      }
    >
      {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin text-[#e6a700]" />}
      {status === "done" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}

      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#31263b] to-[#1f1a25] text-white">
        <Sparkles className="h-2.5 w-2.5" />
      </span>

      <span className="truncate">
        {status === "loading"
          ? "队长拆解中…"
          : status === "running"
            ? `${done}/${total}${skillLine} · ${payload?.plan.modelKind ?? ""}`
            : `完成 ${total}/${total}${skillLine}`}
      </span>

      {payload && allSkills.length > 0 && status === "done" && (
        <span className="flex shrink-0 gap-1">
          {allSkills.slice(0, 2).map((s) => (
            <Badge key={s} className="h-4 bg-[#eee8ff] px-1.5 text-[9px] text-[#665a86]">{s}</Badge>
          ))}
          {allSkills.length > 2 && <span className="text-[9px] text-[#89828d]">+{allSkills.length - 2}</span>}
        </span>
      )}

      <button
        onClick={() => router.push("/plans")}
        className="shrink-0 rounded px-1.5 text-[10px] underline-offset-2 hover:underline"
      >
        看全部 →
      </button>

      {status === "done" && (
        <button onClick={() => toast.dismiss(task)} aria-label="关" className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * 极简版：替代之前 Dialog/浮卡；只做单行 toast。
 * 调用方拿到 task 后渲染一个 <CaptainProgressToast task={...} /> 即可，
 * 视图会随 done/total 实时刷新。
 */
export function CaptainPlanDialog({
  open,
  onClose,
  task,
  input,
}: {
  open: boolean;
  onClose: () => void;
  task: string;
  input?: Record<string, any>;
  title?: string;
}) {
  useEffect(() => {
    if (open) {
      // 单行 toast：固定显示到任务完成或 30 秒；提供「看全部」去 /plans
      toast.custom(
        () => <CaptainProgressToast task={task} input={input} />,
        { id: task, duration: 30000, position: "bottom-right" }
      );
      // 短任务：8 秒自动关；长任务：用户点 X
      const shortTask = task.length <= 24;
      if (shortTask) {
        setTimeout(() => toast.dismiss(task), 8000);
      }
    }
    return () => {
      if (!open) toast.dismiss(task);
    };
  }, [open, task, input]);
  useEffect(() => () => onClose(), [onClose]);
  return null;
}