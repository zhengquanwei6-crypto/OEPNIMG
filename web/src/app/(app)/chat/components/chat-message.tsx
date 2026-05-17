"use client";

import * as React from "react";
import { User, Bot, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Message {
  id: string;
  role: string;
  type: string;
  content: string;
  attachmentsJson: string;
  metadataJson: string;
  createdAt: string;
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isError = message.type === "error";
  const isProgress = message.type === "progress";
  const isImage = message.type === "image";

  const attachments: Array<{ type: string; url: string }> = React.useMemo(() => {
    try { return JSON.parse(message.attachmentsJson); } catch { return []; }
  }, [message.attachmentsJson]);

  return (
    <div className={cn("animate-message-in flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn("text-xs", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div className={cn("max-w-[80%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted rounded-tl-md",
            isError && "bg-destructive/10 text-destructive border border-destructive/20",
            isProgress && "bg-muted/50 border border-dashed"
          )}
        >
          {isProgress && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{message.content}</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message.content}</span>
            </div>
          )}

          {!isProgress && !isError && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Image attachments */}
        {isImage && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.filter((a) => a.type === "image").map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={a.url}
                  alt={`generated-${i}`}
                  className="rounded-lg border shadow-sm max-w-[300px] max-h-[300px] object-cover hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={cn("text-[10px] text-muted-foreground/60", isUser && "text-right")}>
          {new Date(message.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
