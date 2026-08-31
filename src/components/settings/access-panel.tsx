"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AccessPanel() {
  const [mode, setMode] = useState<string>("owner");
  const load = () => fetch("/api/access").then((r) => r.json()).then((d) => setMode(d.mode ?? "owner")).catch(() => {});
  useEffect(() => { load(); }, []);

  function set(next: string) {
    fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: next }) })
      .then((r) => r.json()).then(() => { setMode(next); toast.success(next === "readonly" ? "已启用查看者只读" : "已切回管理员可写"); load(); })
      .catch(() => toast.error("操作失败"));
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#01011b]">访问权限门槛</h3>
            <p className="text-xs text-[#89828d]">分享给身边人/局域网前开启「查看者只读」；查看者不能改数据、删除或触发模型调用。</p>
          </div>
          <Badge className={mode === "readonly" ? "bg-[#b04848]/10 text-[#b04848]" : "bg-[#2f9e6e]/10 text-[#2f9e6e]"}>{mode === "readonly" ? "只读视图" : "管理员可写"}</Badge>
        </div>
        {mode === "readonly" ? (
          <Button size="sm" onClick={() => set("owner")}><Unlock className="h-3.5 w-3.5" /> 切回管理员可写</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => set("readonly")}><Lock className="h-3.5 w-3.5" /> 启用查看者只读</Button>
        )}
      </CardContent>
    </Card>
  );
}
