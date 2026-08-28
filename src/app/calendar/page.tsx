import { PageFrame } from "@/components/layout/page-frame";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">内容排期</h2>
      <div className="surface flex h-64 flex-col items-center justify-center rounded-2xl text-zinc-400">
        <CalendarDays className="h-10 w-10" />
        <p className="mt-2 text-sm">排期日历（演示占位）</p>
      </div>
    </PageFrame>
  );
}
