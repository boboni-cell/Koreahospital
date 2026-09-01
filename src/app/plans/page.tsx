"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle2, AlertCircle, Sparkles, RefreshCw, ListTodo } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PlanStep {
  text: string;
  status: "pending" | "running" | "done" | "failed";
  role: string;
  result: string | null;
  error: string | null;
  started_at?: string;
  completed_at?: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/agent/plans").then((r) => r.json());
      setPlans(d || []);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      toast.success(`step ${stepIdx + 1} 已完成`);
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
            Agent · Collaboration
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-.045em] text-[#211e1c]">
            编排执行计划
          </h2>
          <p className="mt-1 text-sm text-[#817a73]">
            每个 plan 由 strategist 一次性生成，每步可单独点「执行」跑对应角色 Agent；plan 持久化、可追溯。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
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
            <p className="mt-1 text-xs text-[#a9a4ad]">去工作台输入任务，strategist 会自动生成 plan 存到这里</p>
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
                        {p.status}
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
                  </div>
                  {done < total && (
                    <Button
                      size="sm"
                      onClick={() => runAll(p)}
                      disabled={running !== null}
                    >
                      <Play className="h-3.5 w-3.5" /> 一键全部执行
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
                            <Badge className="bg-[#ecedf2] text-[#717a94]">{s.role}</Badge>
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