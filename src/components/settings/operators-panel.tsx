"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Operator {
  id: number;
  name: string;
  responsibility: string | null;
  status: string;
}

interface WorkflowAction {
  id: number;
  object_type: string | null;
  object_id: number | null;
  actor_name: string | null;
  action: string | null;
  detail: string | null;
  created_at: string;
}

export function OperatorsPanel() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [name, setName] = useState("");
  const [responsibility, setResponsibility] = useState("");

  const load = () => {
    fetch("/api/operators").then((r) => r.json()).then(setOperators).catch(() => {});
    fetch("/api/workflow-actions?limit=20").then((r) => r.json()).then(setActions).catch(() => {});
  };
  useEffect(() => {
    load();
  }, []);

  function add() {
    if (!name.trim()) return toast.error("请填写姓名");
    fetch("/api/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, responsibility, status: "active" }),
    })
      .then(() => {
        setName("");
        setResponsibility("");
        toast.success("已新增运营人员");
        load();
      })
      .catch(() => toast.error("新增失败"));
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div>
          <h3 className="font-medium text-[#01011b]">运营人员</h3>
          <p className="text-xs text-[#89828d]">首版单人运营；后续共享工作台时再启用登录与只读权限。</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input className="w-32" value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" />
          <Input
            className="flex-1 min-w-[160px]"
            value={responsibility}
            onChange={(e) => setResponsibility(e.target.value)}
            placeholder="职责"
          />
          <Button size="sm" onClick={add}>新增人员</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {operators.map((o) => (
            <Badge key={o.id} className="border border-[#e4e0e6] bg-white">
              {o.name}
              {o.responsibility ? ` · ${o.responsibility}` : ""}
            </Badge>
          ))}
        </div>
        <div>
          <h4 className="mb-1 text-xs font-medium text-[#717a94]">近期操作</h4>
          {actions.length === 0 ? (
            <p className="text-xs text-[#a9a4ad]">暂无操作记录</p>
          ) : (
            <ul className="space-y-1 text-xs text-[#717a94]">
              {actions.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>
                    {a.actor_name ?? "系统"} · {a.action}
                    {a.detail ? `（${a.detail}）` : ""}
                  </span>
                  <span className="text-[#a9a4ad]">{a.created_at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
