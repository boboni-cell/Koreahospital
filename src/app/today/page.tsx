"use client";

import { PageFrame } from "@/components/layout/page-frame";
import TodayList from "@/components/ops/today-list";

export default function TodayPage() {
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#01011b]">今日一键发布</h2>
      <TodayList />
    </PageFrame>
  );
}
