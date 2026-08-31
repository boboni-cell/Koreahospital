"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Contract {
  id: number; role: string; name: string;
  inputs: string; outputs: string; allowed_actions: string; forbidden_actions: string;
  handoff_fields: string; fail_condition: string; status: string;
}

const fields: { key: keyof Omit<Contract, "id" | "role" | "status">; label: string; ph: string }[] = [
  { key: "inputs", label: "输入", ph: "项目简报、平台、信号…" },
  { key: "outputs", label: "输出", ph: "研究包、母版简报…" },
  { key: "allowed_actions", label: "允许动作", ph: "提取、汇总、标注…" },
  { key: "forbidden_actions", label: "禁止动作", ph: "自动发布、虚构事实…" },
  { key: "handoff_fields", label: "交接字段", ph: "母版、证据、时间…" },
  { key: "fail_condition", label: "失败/停止条件", ph: "缺前置数据时停止并说明…" },
];

export default function AgentContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => fetch("/api/agent-contracts").then((r) => r.json()).then(setContracts).catch(() => {});
  useEffect(() => { load(); }, []);

  function save(c: Contract) {
    fetch("/api/agent-contracts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) })
      .then(() => { toast.success("合同已保存"); setEditId(null); load(); })
      .catch(() => toast.error("保存失败"));
  }

  return (
    <PageFrame>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-900">六角色 Agent 合同</h2>
          <p className="text-sm text-stone-500">每个角色的输入 / 输出 / 允许 / 禁止 / 交接字段 / 失败条件。相同任务可重放；缺前置数据时停止并给出原因。</p>
        </div>
        <Link href="/workbench" className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"><ArrowLeft className="h-3.5 w-3.5" /> 回工作区</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {contracts.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-800">{c.name} <span className="ml-1 text-[11px] font-normal text-stone-400">{c.role}</span></h3>
                  <Badge className="bg-stone-100 text-stone-500 font-normal">{c.status}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => (editId === c.id ? save(c) : setEditId(c.id))}>
                  {editId === c.id ? <><Save className="h-3.5 w-3.5" /> 保存</> : "编辑"}
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-[11px] font-medium text-stone-400">{f.label}</label>
                    {editId === c.id ? (
                      <Textarea className="min-h-12" value={c[f.key] ?? ""} onChange={(e) => setContracts((list) => list.map((x) => x.id === c.id ? { ...x, [f.key]: e.target.value } : x))} placeholder={f.ph} />
                    ) : (
                      <p className="text-sm text-stone-600">{c[f.key] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-1.5 rounded-lg bg-stone-50 px-2.5 py-1.5 text-[11px] text-stone-500">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                医疗合规优先于增长建议；AI 不自动发布、不改正式知识库。
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
}
