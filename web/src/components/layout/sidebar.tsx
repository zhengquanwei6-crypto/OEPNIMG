"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Image,
  LayoutDashboard,
  Server,
  FileCode2,
  Bot,
  History,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { useSidebar } from "./sidebar-context";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavLink[] = [
  { href: "/chat", label: "对话", icon: MessageSquare },
  { href: "/generate", label: "生成", icon: Image },
];

const adminNav: NavLink[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/providers", label: "API 源", icon: Server },
  { href: "/admin/templates", label: "适配器模板", icon: FileCode2 },
  { href: "/admin/agent", label: "LLM 助手", icon: Bot },
  { href: "/admin/history", label: "生成历史", icon: History },
  { href: "/admin/settings", label: "系统设置", icon: Settings },
];

export function Sidebar({ role }: { role?: string }) {
  const { collapsed, setCollapsed, isMobile, setOpen } = useSidebar();
  const pathname = usePathname();

  const handleNav = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className={cn("flex h-topbar items-center border-b px-4", collapsed && "justify-center px-2")}>
        <Link href="/" onClick={handleNav} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            O
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">OEPNIMG</span>
          )}
        </Link>
      </div>

      {/* New Chat Button */}
      <div className={cn("px-3 pt-3", collapsed && "px-2")}>
        <Link href="/chat" onClick={handleNav}>
          <Button variant="outline" className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")} size={collapsed ? "icon" : "default"}>
            <Plus className="h-4 w-4" />
            {!collapsed && <span>新对话</span>}
          </Button>
        </Link>
      </div>

      <Separator className="my-3" />

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          <NavSection items={mainNav} pathname={pathname} collapsed={collapsed} onNav={handleNav} />

          {role === "admin" && (
            <>
              <div className={cn("py-2", collapsed ? "px-0" : "px-3")}>
                {!collapsed && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">管理</p>
                )}
                {collapsed && <Separator />}
              </div>
              <NavSection items={adminNav} pathname={pathname} collapsed={collapsed} onNav={handleNav} />
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

function NavSection({
  items,
  pathname,
  collapsed,
  onNav,
}: {
  items: NavLink[];
  pathname: string;
  collapsed: boolean;
  onNav: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
        const Icon = item.icon;

        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {item.badge}
              </span>
            )}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href} content={item.label} side="right">
              {link}
            </Tooltip>
          );
        }
        return link;
      })}
    </>
  );
}
