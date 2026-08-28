"use client";

import { useEffect, useState } from "react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: number;
  title: string;
  status: string;
  due: string | null;
  assignee: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((d) => setTasks(d));
  }, []);
  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900">任务看板</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["todo", "doing", "done"] as const).map((st) => (
          <div key={st} className="space-y-3">
            <div className="text-sm font-medium text-zinc-500">{STATUS_LABEL[st]}</div>
            {tasks
              .filter((t) => t.status === st)
              .map((t) => (
                <Card key={t.id}>
                  <CardContent className="space-y-1 pt-4">
                    <div className="text-sm font-medium text-zinc-800">{t.title}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      {t.assignee && <Badge>{t.assignee}</Badge>}
                      {t.due && <span>{t.due}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
