"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const [show, setShow] = React.useState(false);

  const posClass =
    side === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-2" :
    side === "bottom" ? "top-full left-1/2 -translate-x-1/2 mt-2" :
    side === "left" ? "right-full top-1/2 -translate-y-1/2 mr-2" :
    "left-full top-1/2 -translate-y-1/2 ml-2";

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            posClass,
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
