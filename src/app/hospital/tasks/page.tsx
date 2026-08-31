"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");

  const load = () => fetch("/api/tasks").then((r) => r.json()).then((d: Task[]) => setTasks(d));
  useEffect(() => { load(); }, []);

  function add() {
    if (!title.trim()) return toast.error("请填写任务标题");
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignee: assignee || null, status: "todo" }),
    })
      .then(() => { setTitle(""); setAssignee(""); toast.success("已新建"); load(); })
      .catch(() => toast.error("新建失败"));
  }

  function changeStatus(id: number, status: string) {
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(() => load());
  }

  function del(id: number) {
    fetch(`/api/tasks/${id}`, { method: "DELETE" }).then(() => { toast.success("已删除"); load(); });
  }

  return (
    <PageFrame>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#01011b]">任务看板</h2>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Input
            className="flex-1 min-w-[200px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新任务标题"
          />
          <Input
            className="w-40"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="负责人（可选）"
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> 新建任务
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["todo", "doing", "done"] as const).map((st) => (
          <div key={st} className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-[#717a94]">
              <span>{STATUS_LABEL[st]}</span>
              <span className="text-xs text-[#89828d]">
                {tasks.filter((t) => t.status === st).length}
              </span>
            </div>
            {tasks
              .filter((t) => t.status === st)
              .map((t) => (
                <Card key={t.id}>
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-[#01011b]">{t.title}</div>
                      <button
                        onClick={() => del(t.id)}
                        className="text-[#a9a4ad] transition hover:text-rose-500"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#89828d]">
                      {t.assignee && <Badge>{t.assignee}</Badge>}
                      {t.due && <span>{t.due}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#89828d]">状态</span>
                      <Select value={t.status} onValueChange={(v) => changeStatus(t.id, v ?? "todo")}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">待办</SelectItem>
                          <SelectItem value="doing">进行中</SelectItem>
                          <SelectItem value="done">已完成</SelectItem>
                        </SelectContent>
                      </Select>
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
