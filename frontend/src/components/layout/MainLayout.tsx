import * as React from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((prev) => !prev);
      return;
    }
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-[#F7F2EA] text-[#1F2430]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,#FFF8EF_0%,#F7F2EA_56%,#EEF0FA_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(31,24,38,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(31,24,38,0.08)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div
        className={
          sidebarCollapsed
            ? "relative z-10 hidden w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:block"
            : "relative z-10 hidden w-[302px] shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:block"
        }
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden bg-[#FFFDF8]/74 shadow-[inset_1px_0_0_rgba(31,24,38,0.06)]">
        <Header isSidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
