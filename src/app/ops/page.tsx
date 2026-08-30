"use client";

import { useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TodayList from "@/components/ops/today-list";
import { AiWorkshop } from "@/components/contents/ai-workshop";

const TABS = [
  { id: "today", label: "今日待发" },
  { id: "schedule", label: "内容排期" },
  { id: "manage", label: "内容管理" },
  { id: "new", label: "新建内容" },
  { id: "ai", label: "AI 文案工坊" },
  { id: "research", label: "选题研究" },
];

export default function OpsHub() {
  const [tab, setTab] = useState("today");
  return (
    <PageFrame>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">运营中心</h2>
        <span className="text-xs text-stone-400">所有运营动作都在这里完成</span>
      </div>
      <Tabs.Root value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="today">
          <TodayList />
        </TabsContent>
        <TabsContent value="schedule">
          <iframe src="/calendar?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="内容排期" />
        </TabsContent>
        <TabsContent value="manage">
          <iframe src="/contents?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="内容管理" />
        </TabsContent>
        <TabsContent value="new">
          <iframe src="/contents/new?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="新建内容" />
        </TabsContent>
        <TabsContent value="ai">
          <AiWorkshop />
        </TabsContent>
        <TabsContent value="research">
          <iframe src="/contents/research?bare=1" className="h-[80vh] w-full rounded-2xl border-0" title="选题研究" />
        </TabsContent>
      </Tabs.Root>
    </PageFrame>
  );
}
