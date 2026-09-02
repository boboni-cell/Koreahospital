"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
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
  catalog?: { id: string; name: string; description: string }[];
}

const ROLE_LABEL: Record<string, string> = {
  strategist: "总控",
  writer: "文案",
  designer: "设计",
  researcher: "研究",
  publisher: "发布",
  analyst: "分析",
};

const ROLE_TONE: Record<string, string> = {
  strategist: "bg-[#31263b] text-white",
  writer: "bg-[#eee8ff] text-[#665a86]",
  designer: "bg-[#f0c7cc] text-[#7a3954]",
  researcher: "bg-[#dff4e8] text-[#35684d]",
  publisher: "bg-[#fae7bf] text-[#8a6321]",
  analyst: "bg-[#d8cdf5] text-[#5a4a8a]",
};

/**
 * ponytail: 根据 task 长度自适应展示
 *   - task ≤ 24 字 → 短任务，只 toast 摘要
 *   - 24 < task ≤ 80 字 → 右下浮卡，半透明，紧凑
 *   - task > 80 字 → 中等 Dialog
 * 用户不需要选 skill，captain 自己挑。
 */
export function CaptainPlanDialog({
  open,
  onClose,
  task,
  input,
  title,
}: {
  open: boolean;
  onClose: () => void;
  task: string;
  input?: Record<string, any>;
  title?: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<CaptainPlanPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const taskLen = task.length;

  useEffect(() => {
    if (!open || !task) return;
    setPayload(null);
    setLoading(true);
    fetch("/api/agent/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, input: input ?? {}, mode: "orchestrate" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.planId && d.steps) {
          setPayload({
            planId: d.planId,
            plan: d.plan,
            steps: d.steps,
            catalog: d.catalog,
          });
        } else {
          toast.error(d.reason || "总控未返回计划");
          onClose();
        }
      })
      .catch(() => toast.error("总控连接失败"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  async function runStep(planId: number, stepIdx: number) {
    const r = await fetch(`/api/agent/plans/${planId}/execute-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step_index: stepIdx }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "执行失败");
    return d;
  }

  async function runAll(planId: number, steps: CaptainPlanStep[]) {
    setRunningAll(true);
    try {
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].status === "done") continue;
        setPayload((p) =>
          p ? { ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, status: "running" } : s)) } : p
        );
        try {
          const result = await runStep(planId, i);
          setPayload((p) =>
            p
              ? {
                  ...p,
                  steps: p.steps.map((s, j) =>
                    j === i ? { ...s, status: result.status === "failed" ? "failed" : "done" } : s
                  ),
                }
              : p
          );
        } catch {
          setPayload((p) => (p ? { ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, status: "failed" } : s)) } : p));
          throw new Error(`第 ${i + 1} 步失败`);
        }
      }
      toast.success("全部完成");
    } catch (e: any) {
      toast.error(e.message || "执行失败");
    } finally {
      setRunningAll(false);
    }
  }

  // 短任务：只 toast，不弹任何面板
  useEffect(() => {
    if (open && !loading && payload && taskLen <= 24) {
      const summary = `队长已规划：${payload.steps.length} 步 · ${payload.plan.skills.length} skill`;
      toast.success(summary);
      // 直接执行（短任务用户不需要 Approve）
      runAll(payload.planId, payload.steps);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, payload, open, taskLen]);

  if (!open) return null;

  const skillList = payload?.catalog?.filter((c) => payload.plan.skills.includes(c.id)) ?? [];

  // 中等长：右下浮卡，紧凑半透明
  if (taskLen > 24 && taskLen <= 80) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e4e0e6] bg-white/95 p-4 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#31263b] to-[#1f1a25] text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold text-[#01011b]">{title ?? "队长规划"}</span>
          </div>
          <button onClick={onClose} aria-label="关闭" className="rounded p-1 hover:bg-[#f4eeea]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {loading || !payload ? (
          <p className="text-xs text-[#77716b]">
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> 队长正在拆解…
          </p>
        ) : (
          <CompactPlanView
            payload={payload}
            skillList={skillList}
            runningAll={runningAll}
            onApprove={() => runAll(payload.planId, payload.steps)}
            onOpen={() => router.push("/plans")}
          />
        )}
      </div>
    );
  }

  // 长任务：中等 Dialog（max-w-xl，比之前 max-w-2xl 小一圈）
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ecedf2] bg-gradient-to-br from-[#fff7e6] to-[#fffefa] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#31263b] to-[#1f1a25] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[#01011b]">{title ?? "队长规划"}</h3>
              <p className="text-[10px] text-[#77716b]">
                {payload?.plan.modelKind ?? "…"} · {payload?.steps.length ?? 0} 步 · {payload?.plan.skills.length ?? 0} skill
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="关闭" className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#f4eeea]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#675f58]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 队长正在拆解…
            </div>
          )}
          {payload && (
            <CompactPlanView
              payload={payload}
              skillList={skillList}
              runningAll={runningAll}
              onApprove={() => runAll(payload.planId, payload.steps)}
              onOpen={() => router.push("/plans")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CompactPlanView({
  payload,
  skillList,
  runningAll,
  onApprove,
  onOpen,
}: {
  payload: CaptainPlanPayload;
  skillList: { id: string; name: string; description: string }[];
  runningAll: boolean;
  onApprove: () => void;
  onOpen: () => void;
}) {
  const allDone = payload.steps.every((s) => s.status === "done");
  return (
    <>
      {payload.plan.note && (
        <p className="mb-2 text-[11px] text-[#43394c]">{payload.plan.note}</p>
      )}
      {skillList.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {skillList.map((s) => (
            <Badge key={s.id} className="bg-[#eee8ff] text-[#665a86]">{s.id}</Badge>
          ))}
        </div>
      )}
      <ol className="mb-3 space-y-1">
        {payload.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px]">
            {s.status === "done" ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            ) : s.status === "failed" ? (
              <X className="h-3 w-3 shrink-0 text-red-500" />
            ) : s.status === "running" ? (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-blue-500" />
            ) : (
              <span className="grid h-3 w-3 shrink-0 place-items-center rounded-full bg-[#31263b] text-[8px] text-white">{i + 1}</span>
            )}
            <Badge className={`${ROLE_TONE[s.role] ?? "bg-[#ecedf2] text-[#717a94]"} text-[9px]`}>{ROLE_LABEL[s.role] ?? s.role}</Badge>
            <span className="truncate text-[#43394c]">{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-2">
        <button onClick={onOpen} className="text-[10px] text-[#665a86] hover:underline">
          打开执行计划 →
        </button>
        {!allDone && (
          <Button size="sm" onClick={onApprove} disabled={runningAll} className="h-7 px-3 text-xs">
            {runningAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Approve & Run
          </Button>
        )}
      </div>
    </>
  );
}