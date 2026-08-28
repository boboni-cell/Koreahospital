import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pl-[68px]">
      <Sidebar />
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-5">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
