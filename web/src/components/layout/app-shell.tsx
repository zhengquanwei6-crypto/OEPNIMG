"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
  username?: string | null;
  role?: string | null;
}

export function AppShell({ children, username, role }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner username={username} role={role}>
        {children}
      </AppShellInner>
    </SidebarProvider>
  );
}

function AppShellInner({ children, username, role }: AppShellProps) {
  const { open, setOpen, collapsed, isMobile } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            "hidden md:flex flex-col border-r bg-sidebar transition-[width] duration-200 ease-in-out",
            collapsed ? "w-sidebar-collapsed" : "w-sidebar"
          )}
        >
          <Sidebar role={role ?? undefined} />
        </aside>
      )}

      {/* Mobile Sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <Sidebar role={role ?? undefined} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar username={username} role={role} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
