import { PageFrame } from "@/components/layout/page-frame";

export default function HomePage() {
  return (
    <PageFrame>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          毛发移植矩阵运营工作台
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          10 账号矩阵 · 今日一键发布 · AI 文案工坊 · 数据看板
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: "今日待发", d: "查看并复制今日各账号内容", h: "/today" },
          { t: "AI 文案工坊", d: "5 角色文案 + 质量打分卡", h: "/contents/ai" },
          { t: "选题研究", d: "多信源选题 + 热度评估", h: "/contents/research" },
          { t: "素材库", d: "合规授权素材管理", h: "/assets" },
          { t: "数据看板", d: "粉丝与互动增长", h: "/data" },
          { t: "SOP 中心", d: "合规红线与方法论", h: "/sop" },
        ].map((c) => (
          <a key={c.h} href={c.h} className="lift surface block rounded-2xl p-4">
            <div className="font-semibold text-zinc-800">{c.t}</div>
            <p className="mt-1 text-xs text-zinc-500">{c.d}</p>
          </a>
        ))}
      </div>
    </PageFrame>
  );
}
