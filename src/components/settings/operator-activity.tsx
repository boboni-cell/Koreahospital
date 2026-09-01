"use client";

import { useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  PackageCheck,
  Send,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface WorkflowAction {
  id: number;
  object_type: string | null;
  object_id: number | null;
  actor_id: number | null;
  actor_name: string | null;
  action: string | null;
  detail: string | null;
  created_at: string;
}

type ActionCategory = "发布" | "审核" | "内容" | "数据" | "其他";

const FILTERS: Array<"全部" | ActionCategory> = ["全部", "发布", "审核", "内容", "数据"];

const ACTIONS: Record<string, { label: string; category: ActionCategory; icon: LucideIcon; tone: string }> = {
  "publish.freeze_snapshot": { label: "发布帖子", category: "发布", icon: Send, tone: "bg-[#c9eadc] text-[#32765c]" },
  "publish_snapshot.create": { label: "生成发布包", category: "发布", icon: PackageCheck, tone: "bg-[#f5ddba] text-[#946626]" },
  "review.approve": { label: "通过内容审核", category: "审核", icon: CheckCircle2, tone: "bg-[#c9eadc] text-[#32765c]" },
  "review.submit": { label: "提交内容审核", category: "审核", icon: FileText, tone: "bg-[#d9d2f5] text-[#6555a2]" },
  "produce.xiaohongshu": { label: "生成小红书内容", category: "内容", icon: Sparkles, tone: "bg-[#f5c7cc] text-[#a64e5b]" },
  "produce.douyin": { label: "生成抖音内容", category: "内容", icon: Sparkles, tone: "bg-[#f5c7cc] text-[#a64e5b]" },
  "content_variant.create": { label: "生成平台版本", category: "内容", icon: FileText, tone: "bg-[#cedcf5] text-[#4e68a6]" },
  "content_brief.create": { label: "创建内容简报", category: "内容", icon: FileText, tone: "bg-[#cedcf5] text-[#4e68a6]" },
  "content.create": { label: "创建帖子草稿", category: "内容", icon: FileText, tone: "bg-[#cedcf5] text-[#4e68a6]" },
  "content.update": { label: "更新帖子内容", category: "内容", icon: FileText, tone: "bg-[#cedcf5] text-[#4e68a6]" },
  "analysis.create": { label: "生成帖子复盘", category: "数据", icon: BarChart3, tone: "bg-[#d9d2f5] text-[#6555a2]" },
  "writeback.confirmed": { label: "确认复盘回写", category: "数据", icon: CheckCircle2, tone: "bg-[#c9eadc] text-[#32765c]" },
  "knowledge.update": { label: "更新知识库", category: "其他", icon: BookOpen, tone: "bg-[#f4e9a9] text-[#846e24]" },
  "account.create": { label: "新增运营账号", category: "其他", icon: UserRound, tone: "bg-[#d9d2f5] text-[#6555a2]" },
};

function presentAction(action: WorkflowAction) {
  return ACTIONS[action.action ?? ""] ?? {
    label: "更新运营记录",
    category: "其他" as const,
    icon: Activity,
    tone: "bg-[#ebe7e2] text-[#6e6760]",
  };
}

function presentDetail(detail: string | null) {
  if (!detail) return "已记录本次操作";
  return detail
    .replace(/\[(?:human|ai)\]\s*/gi, "")
    .replace(/→\s*approve/gi, "→ 已通过")
    .replace(/→\s*submit/gi, "→ 待审核")
    .replace(/\bconfirmed\b/gi, "已确认")
    .replace(/platform=xiaohongshu/gi, "小红书")
    .replace(/platform=douyin/gi, "抖音");
}

function presentTime(value: string) {
  const [date, time = ""] = value.replace("T", " ").split(" ");
  const [, month, day] = date.split("-");
  return month && day ? `${month}月${day}日 ${time.slice(0, 5)}` : value;
}

export function OperatorActivity({ actions }: { actions: WorkflowAction[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("全部");
  const [expanded, setExpanded] = useState(false);
  const filtered = filter === "全部"
    ? actions
    : actions.filter((action) => presentAction(action).category === filter);
  const visible = expanded ? filtered : filtered.slice(0, 8);

  return (
    <section className="rounded-[18px] border border-[#e2dcd5] bg-[#fffefa] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#282420]">运营活动记录</h2>
          <p className="mt-0.5 text-xs text-[#8b837c]">发布、审核、内容生产与数据复盘都会按人员归档在这里</p>
        </div>
        <span className="text-xs font-medium text-[#8b837c]">最近 {actions.length} 条</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="筛选运营活动">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setFilter(item);
              setExpanded(false);
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${filter === item ? "bg-[#171619] text-white" : "border border-[#ded8d1] bg-white text-[#68615b] hover:border-[#bdb4ab]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-[14px] border border-dashed border-[#d9d2cb] bg-[#f8f6f2] px-4 py-12 text-center">
          <p className="text-sm font-medium text-[#706962]">暂无{filter === "全部" ? "" : filter}操作记录</p>
          <p className="mt-1 text-xs text-[#9b948d]">将操作归属到这位人员后，记录会自动出现在这里。</p>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-[#e5dfd9]">
          {visible.map((action) => {
            const presentation = presentAction(action);
            const Icon = presentation.icon;
            return (
              <li key={action.id} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${presentation.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="text-xs font-semibold text-[#322e2a]">{presentation.label}</p>
                    <time className="shrink-0 text-[10px] text-[#99918a]">{presentTime(action.created_at)}</time>
                  </div>
                  <p className="mt-1 break-words text-[11px] leading-5 text-[#746d67]">{presentDetail(action.detail)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {filtered.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 w-full rounded-[11px] border border-[#ded8d1] bg-white py-2 text-[11px] font-semibold text-[#6559a7] transition hover:border-[#bdb4ab]"
        >
          {expanded ? "收起记录" : `查看全部 ${filtered.length} 条记录`}
        </button>
      )}
    </section>
  );
}
