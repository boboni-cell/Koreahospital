import { PageFrame } from "@/components/layout/page-frame";
import { Stethoscope } from "lucide-react";

export default function SchedulePage() {
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">日程管理</h2>
      <div className="surface flex h-56 flex-col items-center justify-center rounded-2xl text-zinc-400">
        <Stethoscope className="h-10 w-10" />
        <p className="mt-2 text-sm">手术 / 面诊日程（演示占位）</p>
      </div>
    </PageFrame>
  );
}
