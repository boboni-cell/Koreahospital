"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Send, Image as ImageIcon, CalendarDays, BookOpen, BarChart3, ArrowRight,
} from "lucide-react";
import { PageFrame } from "@/components/layout/page-frame";

const MODULES = [
  { title: "运营中心", desc: "内容创作与发布管理\n驱动全域运营增长", icon: Send, href: "/ops", hub: ["今日待发", "内容排期", "内容管理", "新建内容", "AI 文案工坊", "选题研究"] },
  { title: "素材中心", desc: "统一素材管理与沉淀\n激发内容创作灵感", icon: ImageIcon, href: "/assets", hub: ["素材库", "AI 生成配图", "批量上传", "选题池"] },
  { title: "日程中心", desc: "日程规划与任务协同\n掌控时间，高效执行", icon: CalendarDays, href: "/hospital/schedule", hub: ["日程管理", "任务看板", "沟通记录"] },
  { title: "SOP 中心", desc: "标准化流程与执行\n保障团队专业一致", icon: BookOpen, href: "/sop", hub: ["矩阵运营规范", "合规红线", "起号方法论", "数据录入 SOP"] },
  { title: "数据中心", desc: "数据洞察与决策支持\n用数据驱动增长", icon: BarChart3, href: "/data", hub: ["数据看板", "数据录入", "报表中心", "账号矩阵"] },
];

const STAT_META = [
  { key: "pendingContents", label: "待发布内容", unit: "项", note: "contents 待发草稿" },
  { key: "totalAssets", label: "素材总数", unit: "", note: "assets 总条目" },
  { key: "todayTasks", label: "今日任务", unit: "项", note: "tasks 今日新增" },
  { key: "activeSop", label: "执行中 SOP", unit: "项", note: "必读 SOP 数" },
  { key: "totalFollowers", label: "数据总览", unit: "k", note: "近 14 天粉丝合计" },
];

export default function HomePage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const fmt = (n: number, unit: string) => (unit === "k" ? (n / 1000).toFixed(1) : `${n}`);

  return (
    <PageFrame>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="pb-2 lg:col-span-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[#89828d]">运营工作台</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#01011b]">下午好，管理者 <span>👋</span></h1>
            <p className="mt-2 text-sm text-[#717a94]">今天是高效运营的第 126 天</p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#dbd7da] bg-white px-4 py-2 text-xs text-[#43394c]">
              <span className="text-[#473982]">✨</span> 有问题，随时问我哦～
            </div>
          </div>

          <div className="relative flex min-h-[160px] items-stretch justify-between overflow-hidden rounded-[6px] border border-[#e4e0e6] bg-white p-6 shadow-[rgba(49,38,59,0.12)_0_16px_40px_-20px] lg:col-span-7">
            <div className="z-10 max-w-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#01011b]">AI Agent</span>
                <span className="rounded-full bg-[#473982]/10 px-2 py-0.5 text-[10px] font-medium text-[#473982]">智能助手</span>
              </div>
              <p className="text-xs leading-relaxed text-[#43394c]">你好呀！我是你的专属运营助手<br />可以帮你创作内容、分析数据、优化流程</p>
              <div className="relative mt-2">
                <input type="text" placeholder="你可以问我任何问题..." className="w-full rounded-[6px] border border-[#dbd7da] bg-white py-2 pl-3.5 pr-9 text-xs text-[#01011b] outline-none transition focus:border-[#473982] focus:ring-2 focus:ring-[#473982]/20 placeholder:text-[#89828d]" />
                <button className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[3px] border border-[#31263b] bg-white text-[#31263b] transition hover:bg-[#ecedf2]">→</button>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex w-52 items-end justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agent.png" alt="Agent Avatar" className="h-full object-contain object-bottom" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const open = hover === m.title;
            return (
              <Link key={m.title} href={m.href} onMouseEnter={() => setHover(m.title)} onMouseLeave={() => setHover(null)} className="surface group relative flex min-h-[150px] flex-col justify-between overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#473982]/10 text-[#473982]"><Icon className="h-5 w-5" /></div>
                <div className="relative">
                  <h3 className="text-sm font-semibold text-[#01011b]">{m.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-[11px] leading-normal text-[#717a94]">{m.desc}</p>
                  <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.hub.map((h) => (<span key={h} className="rounded-full border border-[#e4e0e6] bg-white px-2 py-0.5 text-[10px] text-[#43394c]">{h}</span>))}
                    </div>
                  </motion.div>
                </div>
                <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-[#89828d] opacity-0 transition group-hover:opacity-100" />
              </Link>
            );
          })}
        </section>

        <section className="surface p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#01011b]">今日概览</h2>
            <button className="rounded-[3px] border border-[#31263b] bg-white px-3 py-1 text-xs font-medium text-[#01011b] transition hover:bg-[#ecedf2]">实时</button>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2 sm:grid-cols-3 lg:grid-cols-5">
            {STAT_META.map((s) => (
              <div key={s.key}>
                <div className="text-[11px] text-[#89828d]">{s.label}</div>
                <div className="mt-2 flex items-baseline gap-1"><span className="text-2xl font-semibold text-[#01011b]">{stats ? fmt(stats[s.key] ?? 0, s.unit) : "—"}</span>{s.unit && <span className="text-xs text-[#89828d]">{s.unit}</span>}</div>
                <div className="mt-2 text-[10px] text-[#717a94]">{s.note}</div>
              </div>
            ))}
          </div>
          {stats === null && <p className="mt-3 text-[11px] text-[#89828d]">正在拉取…</p>}
        </section>
      </div>
    </PageFrame>
  );
}
