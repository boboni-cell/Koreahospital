"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_LABELS } from "@/lib/agent-labels";

export interface CaptainPlanStep {
  text: string;
  status: "pending" | "running" | "done" | "failed";
  role: string;
  result: string | null;
  error: string | null;
  skillIds?: string[];
  sources?: string[];
  meta?: { provider: string; model: string; latency_ms: number; is_mock: boolean; key_len: number };
}

export interface CaptainPlanPayload {
  planId: number;
  plan: { modelKind: "text" | "image" | "video"; skills: string[]; note: string };
  steps: CaptainPlanStep[];
}

const ROLE_LABEL = AGENT_LABELS;

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
  const [status, setStatus] = useState<"loading" | "running" | "done" | "failed">("loading");

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
        if (cancelled) return;
        if (!r.ok || !d.planId) throw new Error(d.error || "策略师规划失败");
        setPayload(d);
        setStatus("running");
        void fetch(`/api/agent/plans/${d.planId}/run`, { method: "POST" });
        while (!cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const latest = await fetch(`/api/agent/plans/${d.planId}`).then((res) => res.json());
          if (cancelled) return;
          setPayload((old) => old ? { ...old, steps: latest.steps } : { ...d, steps: latest.steps });
          if (latest.status === "completed" || latest.status === "partial") {
            setStatus(latest.status === "completed" ? "done" : "failed");
            return;
          }
        }
      } catch {
        if (cancelled) return;
        setStatus("failed");
        toast.error("队长连接失败");
      }
    })();
    return () => { cancelled = true; };
  }, [task]);

  if (!task) return null;

  const allSkills = payload?.plan.skills ?? [];
  const steps = payload?.steps ?? [];
  const done = steps.filter((s) => s.status === "done").length;
  const current = steps.find((s) => s.status === "running") || steps.find((s) => s.status === "pending");
  const currentLabel = current ? (ROLE_LABEL[current.role] || current.role) : "队长";

  return (
    <div
      className={
        "pointer-events-auto flex w-fit max-w-[min(90vw,720px)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm backdrop-blur transition " +
        (status === "loading"
          ? "border-[#cbd8f1] bg-white/95 text-[#3d4f7a]"
          : status === "running"
            ? "border-[#fae7bf] bg-[#fffbef]/95 text-[#7a571c]"
            : status === "failed"
              ? "border-red-200 bg-red-50/95 text-red-700"
              : "border-[#c8e6d4] bg-[#f0fbf4]/95 text-[#35684d]")
      }
    >
      {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin text-[#e6a700]" />}
      {status === "done" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
      {status === "failed" && <AlertCircle className="h-3 w-3 text-red-500" />}

      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#31263b] to-[#1f1a25] text-white">
        <Sparkles className="h-2.5 w-2.5" />
      </span>

      <span className="truncate">
        {status === "loading"
          ? "策略师正在为您拆解任务…"
          : status === "running"
            ? `${currentLabel}正在处理：${current?.text || `已完成 ${done}/${steps.length}`}`
            : status === "failed" ? "执行未完成，请查看执行计划中的失败原因" : `任务已完成（${done}/${steps.length}）`}
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

      {(status === "done" || status === "failed") && (
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
        { id: task, duration: Infinity, position: "bottom-right" }
      );
    }
    return () => {
      if (!open) toast.dismiss(task);
    };
  }, [open, task, input]);
  useEffect(() => () => onClose(), [onClose]);
  return null;
}
