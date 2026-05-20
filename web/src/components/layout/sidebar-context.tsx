"use client";

import * as React from "react";

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false); // mobile sheet open
  const [collapsed, setCollapsed] = React.useState(false); // desktop collapsed
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (!e.matches) setOpen(false); // close sheet when going desktop
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist collapsed state
  React.useEffect(() => {
    const saved = localStorage.getItem("oepnimg-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("oepnimg-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, collapsed, setCollapsed, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}
