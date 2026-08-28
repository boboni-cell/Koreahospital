"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen pl-[68px]">
      <Sidebar />
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-5">
        <PageTransition key={pathname}>{children}</PageTransition>
      </main>
    </div>
  );
}
