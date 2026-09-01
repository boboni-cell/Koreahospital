"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";

const PRIMARY_ROUTES = new Set(["/", "/workbench", "/production", "/contents", "/assets", "/calendar", "/review", "/settings"]);

export function PageFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [bare, setBare] = useState(false);

  useEffect(() => {
    setBare(window.location.search.includes("bare=1"));
  }, []);

  function goBack() {
    if (window.history.length <= 1) router.push("/workbench");
    else router.back();
  }

  if (bare) {
    return <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">{children}</main>;
  }

  return (
    <div className="min-h-screen lg:pl-[256px]">
      <Sidebar />
      <Header />
      <main className="mx-auto w-full max-w-[1540px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
        {!PRIMARY_ROUTES.has(pathname) && (
          <button
            onClick={goBack}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#dfdad4] bg-white px-3 py-1.5 text-xs font-medium text-[#6d6761] transition hover:border-[#b8b0a8] hover:text-[#171619]"
            aria-label="返回上一页"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回
          </button>
        )}
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
