"use client";

import * as React from "react";
import { ConversationList } from "./components/conversation-list";
import { ChatArea } from "./components/chat-area";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * ChatShell: 两栏布局
 * - 左侧：会话列表（桌面端嵌在主内容区左侧，移动端隐藏）
 * - 右侧：当前对话聊天区域
 */
export function ChatShell() {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const { isMobile } = useSidebar();

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex h-full overflow-hidden">
      {/* 会话列表 - 桌面端始终可见 */}
      <div
        className={cn(
          "flex-shrink-0 border-r bg-card overflow-hidden transition-all",
          isMobile
            ? activeId ? "w-0" : "w-full"
            : "w-[260px]"
        )}
      >
        <ConversationList
          activeId={activeId}
          onSelect={setActiveId}
          refreshKey={refreshKey}
        />
      </div>

      {/* 聊天区域 */}
      <div className={cn("flex-1 min-w-0", isMobile && !activeId && "hidden")}>
        <ChatArea
          conversationId={activeId}
          onBack={() => setActiveId(null)}
          onNewConversation={(id) => { setActiveId(id); refresh(); }}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
