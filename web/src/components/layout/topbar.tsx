"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Moon, Sun, Monitor, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "./sidebar-context";
import { THEME_KEY, type Theme } from "@/lib/theme";

interface TopbarProps {
  username?: string | null;
  role?: string | null;
}

export function Topbar({ username, role }: TopbarProps) {
  const { isMobile, setOpen } = useSidebar();

  return (
    <header className="flex h-topbar items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="打开菜单">
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeDropdown />
        {username ? (
          <UserMenu username={username} role={role} />
        ) : (
          <Link href="/login">
            <Button variant="ghost" size="sm">登录</Button>
          </Link>
        )}
      </div>
    </header>
  );
}

function ThemeDropdown() {
  const [theme, setTheme] = React.useState<Theme>("system");

  React.useEffect(() => {
    setTheme((localStorage.getItem(THEME_KEY) as Theme) || "system");
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  const icon = theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="切换主题">
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => apply("light")}>
          <Sun className="mr-2 h-4 w-4" /> 亮色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => apply("dark")}>
          <Moon className="mr-2 h-4 w-4" /> 暗色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => apply("system")}>
          <Monitor className="mr-2 h-4 w-4" /> 跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ username, role }: { username: string; role?: string | null }) {
  const initials = username.slice(0, 2).toUpperCase();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            {role && <p className="text-xs text-muted-foreground">{role}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> 账户设置
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> 退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
