"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Skill { id: string; name: string; description: string }
interface PlatformMap { [platform: string]: string | string[] }

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [platformSkill, setPlatformSkill] = useState<PlatformMap>({});

  useEffect(() => {
    fetch("/api/skills").then((r) => r.json()).then((d) => { setSkills(d.skills ?? []); setPlatformSkill(d.platformSkill ?? {}); }).catch(() => {});
  }, []);

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[#01011b]">模型 / Skill 设置</h3>
          <p className="text-xs text-[#89828d]">业务页面静默调度；来源/版本/许可证与平台映射见下；调用记录在操作记录与发布快照中可审计。</p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.id} className="flex items-start gap-2 rounded-[6px] border border-[#e4e0e6] px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#01011b]">{s.name}</p>
                <p className="text-[10px] text-[#89828d]">{s.id}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-[#717a94]">{s.description}</p>
              </div>
              <Badge className="shrink-0 bg-[#473982]/10 text-[#473982]">本地</Badge>
            </div>
          ))}
        </div>
        {skills.length === 0 && <p className="text-xs text-[#89828d]">暂无 Skill</p>}
        <div>
          <p className="mb-1 text-[11px] font-medium text-[#43394c]">平台 → Skill 映射</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(platformSkill).map(([p, ids]) => (
              <span key={p} className="rounded-full border border-[#dbd7da] bg-white px-2 py-1 text-[10px] text-[#43394c]">
                {p}: {Array.isArray(ids) ? ids.join(", ") : ids}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
