"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Send,
  Image as ImageIcon,
  CalendarDays,
  BookOpen,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";

const MODULES = [
  {
    title: "运营中心",
    desc: "内容创作与发布管理<br>驱动全域运营增长",
    cls: "card-pink",
    icon: Send,
    iconCls: "text-rose-400",
    href: "/ops",
    hub: ["今日待发", "内容排期", "内容管理", "新建内容", "AI 文案工坊", "选题研究"],
  },
  {
    title: "素材中心",
    desc: "统一素材管理与沉淀<br>激发内容创作灵感",
    cls: "card-orange",
    icon: ImageIcon,
    iconCls: "text-amber-500",
    href: "/assets",
    hub: ["素材库", "AI 生成配图", "批量上传", "选题池"],
  },
  {
    title: "日程中心",
    desc: "日程规划与任务协同<br>掌控时间，高效执行",
    cls: "card-purple",
    icon: CalendarDays,
    iconCls: "text-indigo-400",
    href: "/hospital/schedule",
    hub: ["日程管理", "任务看板", "沟通记录"],
  },
  {
    title: "SOP 中心",
    desc: "标准化流程与执行<br>保障团队专业一致",
    cls: "card-yellow",
    icon: BookOpen,
    iconCls: "text-amber-600",
    href: "/sop",
    hub: ["矩阵运营规范", "合规红线", "起号方法论", "数据录入 SOP"],
  },
  {
    title: "数据中心",
    desc: "数据洞察与决策支持<br>用数据驱动增长",
    cls: "card-blue",
    icon: BarChart3,
    iconCls: "text-sky-400",
    href: "/data",
    hub: ["数据看板", "数据录入", "报表中心", "账号矩阵"],
  },
];

const STAT_META = [
  { key: "pendingContents", label: "待发布内容", unit: "项", tone: "text-rose-500", note: "contents 待发草稿" },
  { key: "totalAssets", label: "素材总数", unit: "", tone: "text-emerald-500", note: "assets 总条目" },
  { key: "todayTasks", label: "今日任务", unit: "项", tone: "text-indigo-500", note: "tasks 今日新增" },
  { key: "activeSop", label: "执行中 SOP", unit: "项", tone: "text-stone-500", note: "必读 SOP 数" },
  { key: "totalFollowers", label: "数据总览", unit: "k", tone: "text-sky-500", note: "近 14 天粉丝合计" },
];

export default function HomePage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const fmt = (n: number, unit: string) =>
    unit === "k" ? `${(n / 1000).toFixed(1)}` : `${n}`;

  return (
    <PageFrame>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* 问候 + AI Agent */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="pb-2 lg:col-span-5">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-800">
              下午好，管理者 <span>👋</span>
            </h1>
            <p className="mt-2 text-xs text-stone-400">今天是高效运营的第 126 天</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white/40 px-4 py-2 text-xs text-stone-500 shadow-sm backdrop-blur-md">
              <span>✨ 有问题，随时问我哦～</span>
            </div>
          </div>

          <div className="relative flex min-h-[160px] justify-between overflow-hidden rounded-3xl border border-white bg-white/80 p-6 shadow-xl shadow-stone-200/40 backdrop-blur-xl lg:col-span-7">
            <div className="z-10 max-w-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-stone-800">AI Agent</span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                  智能助手
                </span>
              </div>
              <p className="text-xs leading-relaxed text-stone-500">
                你好呀！我是你的专属运营助手
                <br />
                可以帮你创作内容、分析数据、优化流程✨
              </p>
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder="你可以问我任何问题..."
                  className="w-full rounded-full border border-stone-200/50 bg-stone-100/70 py-2 pl-3.5 pr-8 text-xs focus:outline-none placeholder-stone-400"
                />
                <button className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-300 text-white transition-colors hover:bg-rose-400">
                  →
                </button>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex w-52 items-end justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/agent.png"
                alt="Agent Avatar"
                className="h-full object-contain object-bottom"
              />
            </div>
          </div>
        </section>

        {/* 5 个模块卡（hover 展开 hub 入口） */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const open = hover === m.title;
            return (
              <Link
                key={m.title}
                href={m.href}
                onMouseEnter={() => setHover(m.title)}
                onMouseLeave={() => setHover(null)}
                className={`lift ${m.cls} relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-sm transition-all duration-300`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                  <Icon className={`h-5 w-5 ${m.iconCls}`} />
                </div>
                <div className="relative">
                  <h3 className="text-base font-bold text-stone-800">{m.title}</h3>
                  <p
                    className="mt-1 text-[11px] leading-normal text-stone-500"
                    dangerouslySetInnerHTML={{ __html: m.desc }}
                  />
                  <motion.div
                    initial={false}
                    animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.hub.map((h) => (
                        <span
                          key={h}
                          className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-stone-600"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </section>

        {/* 今日概览（真实数据） */}
        <section className="glass-card rounded-3xl p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800">今日概览</h2>
            <button className="flex items-center gap-1.5 rounded-full border border-white bg-white/60 px-3 py-1 text-xs text-stone-600">
              <span>实时</span>
              <span className="text-stone-400">▾</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2 sm:grid-cols-3 lg:grid-cols-5">
            {STAT_META.map((s) => (
              <div key={s.key}>
                <div className="text-[11px] text-stone-400">{s.label}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-stone-800">
                    {stats ? fmt(stats[s.key] ?? 0, s.unit) : "—"}
                  </span>
                  {s.unit && <span className="text-xs text-stone-400">{s.unit}</span>}
                </div>
                <div className="mt-2 text-[10px] font-medium text-stone-400">{s.note}</div>
              </div>
            ))}
          </div>
          {stats === null && (
            <p className="mt-3 text-[11px] text-stone-400">正在从本地数据库拉取…</p>
          )}
        </section>
      </div>
    </PageFrame>
  );
}
