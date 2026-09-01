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
  skillContents?: { id: string; name: string; description: string }[];
  catalog?: { id: string; name: string; description: string }[];
}

const ROLE_LABEL: Record<string, string> = {
  strategist: "总控（规划）",
  writer: "文案",
  designer: "设计 / 配图",
  researcher: "研究 / 选题",
  publisher: "发布",
  analyst: "数据 / 复盘",
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
 * Plan → Approve → Run 弹窗（借鉴 dsh-agent-teams 的 activity panel 思路）。
 * 父级控制 open + onClose；plan 自动跑 captains + 一键执行 steps。
 */
export function CaptainPlanDialog({
  open,
  onClose,
  task,
  input,
  title,
  autoApprove,
}: {
  open: boolean;
  onClose: () => void;
  task: string;
  input?: Record<string, any>;
  title?: string;
  /** ponytail: 自动跑（用于 "Approve & Run"）；用户能看到每步 result。 */
  autoApprove?: boolean;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<CaptainPlanPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

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
          if (autoApprove) {
            setTimeout(() => runAll(d.planId, d.steps), 50);
          }
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
        // 推进本地状态
        setPayload((p) => p && { ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, status: "running" } : s)) });
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
          setPayload((p) => p && { ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, status: "failed" } : s)) });
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

  if (!open) return null;

  const skillList = payload?.catalog?.filter((c) => payload.plan.skills.includes(c.id)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ecedf2] bg-gradient-to-br from-[#fff7e6] to-[#fffefa] px-6 py-5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#31263b] text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-[#01011b]">总控已规划：{title ?? "执行计划"}</h3>
                <p className="text-[11px] text-[#77716b]">模型类型 {payload?.plan.modelKind ?? "…"} · {payload?.steps.length ?? 0} 步 · {payload?.plan.skills.length ?? 0} 个 skill</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#43394c]">
              {payload?.plan.note ?? (loading ? "总控正在思考…" : "等待中")}
            </p>
          </div>
          <button onClick={onClose} aria-label="关闭" className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#f4eeea]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="space-y-5 p-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#675f58]">
              <Loader2 className="h-4 w-4 animate-spin" />
              队长正在拆解任务并召集队员…
            </div>
          )}

          {/* 选中的 skill */}
          {skillList.length > 0 && (
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#89828d]">调用的 skill</h4>
              <div className="space-y-2">
                {skillList.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 rounded-lg bg-[#f6f4f5] p-2 text-xs">
                    <Badge className="bg-white text-[#31263b]">{s.id}</Badge>
                    <span className="text-[#43394c]">{s.description.slice(0, 120)}…</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 执行步骤 */}
          {payload && payload.steps.length > 0 && (
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#89828d]">队员将按顺序执行</h4>
              <ol className="space-y-2">
                {payload.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-[#e8e1da] bg-white p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#31263b] text-[11px] text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_TONE[s.role] ?? "bg-[#ecedf2] text-[#717a94]"}>{ROLE_LABEL[s.role] ?? s.role}</Badge>
                        <span className="text-sm font-medium text-[#211e1c]">{s.text}</span>
                      </div>
                      {s.meta && (
                        <p className="mt-1 text-[10px] text-[#89828d]">
                          {s.meta.is_mock ? "🟡 mock" : "🟢 real"} · {s.meta.provider}/{s.meta.model} · {s.meta.latency_ms}ms
                        </p>
                      )}
                      {s.result && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-[#675f58]">查看产出 ({s.result.length} 字符)</summary>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#f6f4f5] p-2 text-[11px] text-[#31263b]">{s.result}</pre>
                        </details>
                      )}
                      {s.status === "failed" && s.error && <p className="mt-1 text-[11px] text-red-500">✕ {s.error}</p>}
                    </div>
                    {s.status === "done" && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t border-[#ecedf2] bg-white px-6 py-4">
          <Button variant="outline" onClick={() => router.push(`/plans`)}>
            打开执行计划页
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>关闭</Button>
            {payload && !autoApprove && (
              <Button onClick={() => runAll(payload.planId, payload.steps)} disabled={runningAll}>
                {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Approve & Run 一键执行
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
