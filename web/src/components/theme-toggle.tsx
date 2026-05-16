"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";

const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "跟随系统", light: "亮色", dark: "暗色" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setTheme(saved);
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    const dark =
      t === "dark" ||
      (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  function next() {
    const i = ORDER.indexOf(theme);
    apply(ORDER[(i + 1) % ORDER.length]);
  }

  return (
    <button
      onClick={next}
      title={`主题：${LABEL[theme]}`}
      className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
    >
      {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🌓"}
    </button>
  );
}
