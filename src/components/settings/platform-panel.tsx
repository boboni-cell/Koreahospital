"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface P { id: string; name: string; status: string }
export function PlatformPanel() {
  const [platforms, setPlatforms] = useState<P[]>([]);
  const [skill, setSkill] = useState<Record<string, string | string[]>>({});
  useEffect(() => { fetch("/api/platforms").then((r) => r.json()).then((d) => { setPlatforms(d.platforms ?? []); setSkill(d.skill ?? {}); }).catch(() => {}); }, []);

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[#01011b]">平台扩展位</h3>
          <p className="text-xs text-[#89828d]">复用同一 项目/账号/母版/审核/发布/复盘 协议，不复制工作台；小红书/抖音已首发，其余按优先级扩展。</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {platforms.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-[6px] border border-[#e4e0e6] px-2.5 py-2">
              <div>
                <p className="text-xs font-medium text-[#01011b]">{p.name}</p>
                <p className="text-[9px] text-[#89828d]">{p.id}</p>
              </div>
              <Badge className={p.status === "active" ? "bg-[#2f9e6e]/10 text-[#2f9e6e]" : "bg-[#ecedf2] text-[#717a94]"}>{p.status === "active" ? "可用" : "规划中"}</Badge>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(skill).map(([p, ids]) => (
            <span key={p} className="rounded-full border border-[#dbd7da] bg-white px-2 py-1 text-[10px] text-[#43394c]">{p}: {Array.isArray(ids) ? ids.join(", ") : ids}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
