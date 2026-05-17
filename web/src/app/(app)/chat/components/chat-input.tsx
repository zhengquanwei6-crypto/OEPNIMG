"use client";

import * as React from "react";
import { Send, Image as ImageIcon, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface Props {
  onSend: (content: string, mode: "chat" | "image") => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = React.useState("");
  const [mode, setMode] = React.useState<"chat" | "image">("image");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim(), mode);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  return (
    <div className="border-t bg-background p-3">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          {/* Mode toggle */}
          <Tooltip content={mode === "image" ? "当前：画图模式" : "当前：聊天模式"} side="top">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn(
                "shrink-0 rounded-lg",
                mode === "image" ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
              onClick={() => setMode(mode === "image" ? "chat" : "image")}
            >
              {mode === "image" ? <ImageIcon className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </Button>
          </Tooltip>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={mode === "image" ? "描述你想生成的图片…" : "输入消息…"}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          {/* Send button */}
          <Button
            type="submit"
            size="icon-sm"
            disabled={!value.trim() || disabled}
            className="shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode indicator */}
        <div className="mt-1.5 flex items-center gap-2 px-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            mode === "image" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {mode === "image" ? <ImageIcon className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
            {mode === "image" ? "画图" : "聊天"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {mode === "image" ? "发送 prompt 生成图片" : "与 AI 对话"} · Shift+Enter 换行
          </span>
        </div>
      </form>
    </div>
  );
}
