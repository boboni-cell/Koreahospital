"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";

export function PageFrame({ children }: { children: React.ReactNode }) {
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
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
