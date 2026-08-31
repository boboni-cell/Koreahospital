"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";

export function PageFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  function goBack() {
    if (typeof window !== "undefined" && window.history.length <= 1) router.push("/");
    else router.back();
  }
  // bare=1：被 /ops 聚合页 iframe 嵌入时，去掉自身侧栏/顶栏，避免重复出现两条侧栏
  const [bare, setBare] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBare(window.location.search.includes("bare=1"));
    }
  }, []);

  if (bare) {
    return <main className="mx-auto w-full max-w-7xl px-5 py-5">{children}</main>;
  }

  return (
    <div className="min-h-screen pl-[68px]">
      <Sidebar />
      <Header />
      <main className="mx-auto w-full max-w-7xl px-5 py-5">
        <button
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-medium text-[#717a94] transition hover:-translate-x-0.5 hover:text-[#01011b]"
          aria-label="返回上一页"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 返回
        </button>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
