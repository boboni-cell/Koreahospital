"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, UserRound } from "lucide-react";
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

export function OperatorsPanel() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [name, setName] = useState("");
  const [responsibility, setResponsibility] = useState("");

  const load = () => {
    fetch("/api/operators").then((r) => r.json()).then(setOperators).catch(() => {});
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
        <div className="grid gap-3 sm:grid-cols-2">
          {operators.map((operator) => (
            <Link
              key={operator.id}
              href={`/settings/operators/${operator.id}`}
              className="group rounded-[18px] border border-[#e2dcd5] bg-[#fffefa] p-4 transition hover:-translate-y-0.5 hover:border-[#c8bfb6] hover:shadow-[0_12px_28px_rgba(38,33,29,.07)] sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-[#d9d2f5] text-[#584d8e]">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-[#201e1b]">{operator.name}</h4>
                    <Badge className="border border-[#b9decf] bg-[#e3f3ec] text-[#34765d]">在岗</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[#746d67]">{operator.responsibility || "负责当前项目运营"}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#9b948d] transition group-hover:translate-x-0.5 group-hover:text-[#6559a7]" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#ece6e0] pt-3 text-[11px] text-[#89817a]">
                <span>独立运营记录页</span>
                <span className="font-semibold text-[#6559a7]">查看记录</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
