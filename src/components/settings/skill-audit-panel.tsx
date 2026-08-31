"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Audit { id: number; repo: string | null; url: string | null; commit_ref: string | null; license: string | null; skill_id: string | null; status: string; notes: string | null }

export function SkillAuditPanel() {
  const [rows, setRows] = useState<Audit[]>([]);
  const load = () => fetch("/api/skill-audits").then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  function decide(r: Audit, action: string) {
    fetch("/api/skill-audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status: action, commit_ref: r.commit_ref ?? "待核对", license: r.license ?? "MIT" }) })
      .then(() => { toast.success(action === "approved" ? "已通过审计" : "已驳回"); load(); })
      .catch(() => toast.error("操作失败"));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[#01011b]">外部方法论 Skill 审计</h3>
          <p className="text-xs text-[#89828d]">审核 marketingskills 七个子 Skill：需去重、无自动脚本、无未经验证医疗结论；medical-compliance 优先级不变。</p>
        </div>
        <div className="space-y-1.5">
          {rows.length === 0 ? <p className="text-xs text-[#89828d]">暂无审计记录</p> : rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 rounded-[6px] border border-[#e4e0e6] px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#01011b]">{r.skill_id}</p>
                <p className="text-[10px] text-[#89828d]">{r.repo} · {r.license ?? "—"} · {r.commit_ref ?? "待核对"}</p>
                {r.notes && <p className="mt-0.5 text-[10px] text-[#717a94]">{r.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge className={r.status === "approved" ? "bg-[#2f9e6e]/10 text-[#2f9e6e]" : r.status === "rejected" ? "bg-[#b04848]/10 text-[#b04848]" : "bg-[#473982]/10 text-[#473982]"}>{r.status === "approved" ? "已通过" : r.status === "rejected" ? "已驳回" : "建议"}</Badge>
                {r.status !== "approved" && <Button size="sm" className="h-6 text-[11px]" onClick={() => decide(r, "approved")}><ShieldCheck className="h-3 w-3" /> 通过</Button>}
                {r.status !== "rejected" && <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => decide(r, "rejected")}>驳回</Button>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
