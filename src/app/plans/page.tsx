"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle2, AlertCircle, Sparkles, RefreshCw, ListTodo } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_LABELS } from "@/lib/agent-labels";

interface PlanStep {
  text: string;
  status: "pending" | "running" | "done" | "failed";
  role: string;
  result: string | null;
  error: string | null;
  started_at?: string;
  completed_at?: string;
  meta?: { provider: string; model: string; latency_ms: number; is_mock: boolean; key_len: number };
  sources?: string[];
}
interface Plan {
  id: number;
  task: string;
  note: string | null;
  status: string;
  created_at: string;
  steps: PlanStep[];
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<{ plan: number; step: number } | null>(null);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const d = await fetch("/api/agent/plans").then((r) => r.json());
      setPlans(d || []);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);
  useEffect(() => {
    if (!plans.some((p) => p.status === "pending" || p.status === "running")) return;
    const timer = setInterval(() => load(), 2000);
    return () => clearInterval(timer);
  }, [plans, load]);

  async function runStep(planId: number, stepIdx: number) {
    setRunning({ plan: planId, step: stepIdx });
    try {
      const r = await fetch(`/api/agent/plans/${planId}/execute-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_index: stepIdx }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "执行失败");
      toast.success(`第 ${stepIdx + 1} 步已完成`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "执行失败");
      await load();
    } finally {
      setRunning(null);
    }
  }

  async function runAll(plan: Plan) {
    for (let i = 0; i < plan.steps.length; i++) {
      if (plan.steps[i].status === "done") continue;
      await runStep(plan.id, i);
    }
  }

  return (
    <PageFrame>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#99918a]">
            团队协作
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
            执行计划
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            策略师会安排团队按顺序完成任务，首页和这里都会显示当前进度。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4" /> 刷新
          </Button>
          <a href="/workbench#agent-task">
            <Button>
              <Sparkles className="h-4 w-4" /> 去工作台发起任务
            </Button>
          </a>
        </div>
      </div>

      {loading && <p className="py-8 text-center text-sm text-[#89828d]">加载中…</p>}
      {!loading && plans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ListTodo className="mx-auto h-10 w-10 text-[#89828d]" />
            <p className="mt-3 text-sm text-[#89828d]">暂无执行计划</p>
            <p className="mt-1 text-xs text-[#a9a4ad]">去工作台输入任务，策略师会自动生成执行计划</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {plans.map((p) => {
          const done = p.steps.filter((s) => s.status === "done").length;
          const total = p.steps.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <Card key={p.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={p.status === "completed" ? "bg-emerald-100 text-emerald-600" : p.status === "partial" ? "bg-amber-100 text-amber-600" : p.status === "running" ? "bg-blue-100 text-blue-600" : "bg-[#ecedf2] text-[#717a94]"}>
                        {{ pending: "等待开始", running: "正在执行", completed: "已完成", partial: "部分完成" }[p.status] || p.status}
                      </Badge>
                      <Badge>#{p.id}</Badge>
                      <span className="text-[11px] text-[#89828d]">{p.created_at?.slice(0, 19).replace("T", " ")}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-[#01011b]">{p.task}</h3>
                    {p.note && <p className="mt-1 text-xs text-[#717a94]">📝 {p.note}</p>}
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#675f58]">
                      <span>{done} / {total} 已完成</span>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#ecedf2]">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {p.status === "running" && (() => { const current = p.steps.find((s) => s.status === "running") || p.steps.find((s) => s.status === "pending"); return current ? <p className="mt-1 text-xs text-blue-600">{AGENT_LABELS[current.role] || current.role}正在处理：{current.text}</p> : null; })()}
                  </div>
                  {done < total && (
                    <Button
                      size="sm"
                      onClick={() => runAll(p)}
                      disabled={running !== null}
                    >
                      <Play className="h-3.5 w-3.5" /> 继续执行
                    </Button>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {p.steps.map((s, i) => (
                    <div key={i} className="rounded-xl border border-[#e8e1da] bg-[#f8f4ef] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {s.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                              s.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                              s.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> :
                              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#ecedf2] text-[10px] text-[#717a94]">{i + 1}</span>}
                            <Badge className="bg-[#ecedf2] text-[#717a94]">{AGENT_LABELS[s.role] || s.role}</Badge>
                            <span className="text-sm font-medium text-[#211e1c]">{s.text}</span>
                          </div>
                          {s.status === "failed" && s.error && (
                            <p className="mt-1 text-xs text-red-500">✕ {s.error}</p>
                          )}
                          {s.status === "done" && s.result && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-[#675f58]">查看产出（{s.result.length} 字符）</summary>
                              <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-[#31263b]">{s.result}</pre>
                            </details>
                          )}
                          {s.sources && s.sources.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-[#675f58]">查看来源（{s.sources.length} 条）</summary>
                              <div className="mt-1 space-y-1 text-xs">{s.sources.map((source) => <a key={source} href={source} target="_blank" rel="noreferrer" className="block truncate text-blue-600 underline">{source}</a>)}</div>
                            </details>
                          )}
                          {s.status === "done" && s.meta && (
                            <p className="mt-1 text-[11px] text-[#89828d]">
                              {s.meta.is_mock ? "🟡 mock" : "🟢 real"} · {s.meta.provider}/{s.meta.model} · {s.meta.latency_ms}ms
                            </p>
                          )}
                        </div>
                        {s.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runStep(p.id, i)}
                            disabled={running !== null}
                          >
                            {running?.plan === p.id && running?.step === i ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                            执行
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageFrame>
  );
}
