"use client";

import * as React from "react";
import { ArrowLeft, Send, Image as ImageIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";

interface Message {
  id: string;
  role: string;
  type: string;
  content: string;
  attachmentsJson: string;
  metadataJson: string;
  createdAt: string;
}

interface Props {
  conversationId: string | null;
  onBack: () => void;
  onNewConversation: (id: string) => void;
  isMobile: boolean;
}

export function ChatArea({ conversationId, onBack, onNewConversation, isMobile }: Props) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Fetch messages when conversation changes
  React.useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((j) => { if (j.ok) setMessages(j.data); })
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(content: string, mode: "chat" | "image") {
    if (!content.trim()) return;

    let convId = conversationId;

    // If no active conversation, create one
    if (!convId) {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: content.slice(0, 30) }) });
      const json = await res.json();
      if (!json.ok) return;
      convId = json.data.id;
      onNewConversation(convId);
    }

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      type: mode === "image" ? "text" : "text",
      content,
      attachmentsJson: "[]",
      metadataJson: JSON.stringify({ mode }),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      // Save user message to server
      const userRes = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content, metadataJson: JSON.stringify({ mode }) }),
      });
      const userJson = await userRes.json();
      if (userJson.ok) {
        setMessages((prev) => prev.map((m) => m.id === tempUserMsg.id ? userJson.data : m));
      }

      if (mode === "image") {
        // Generate image via /api/generate
        await handleImageGeneration(convId, content);
      } else {
        // Chat mode: call /api/chat/completions (or just echo for now)
        await handleChatCompletion(convId, content);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleImageGeneration(convId: string, prompt: string) {
    // Add "generating" placeholder
    const tempId = "gen-" + Date.now();
    const progressMsg: Message = {
      id: tempId,
      role: "assistant",
      type: "progress",
      content: "正在生成图片…",
      attachmentsJson: "[]",
      metadataJson: "{}",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, progressMsg]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: 1 }),
      });
      const json = await res.json();

      let assistantMsg: Message;
      if (json.ok && json.data) {
        const gen = json.data;
        const urls = JSON.parse(gen.resultUrlsJson || "[]");
        assistantMsg = {
          id: "aimg-" + Date.now(),
          role: "assistant",
          type: "image",
          content: urls.length > 0 ? `生成完成 (${gen.durationMs ?? 0}ms)` : "生成完成",
          attachmentsJson: JSON.stringify(urls.map((u: string) => ({ type: "image", url: u }))),
          metadataJson: JSON.stringify({ generationId: gen.id, provider: gen.providerId, model: gen.modelId }),
          createdAt: new Date().toISOString(),
        };
      } else {
        assistantMsg = {
          id: "err-" + Date.now(),
          role: "assistant",
          type: "error",
          content: json.error ?? "图片生成失败",
          attachmentsJson: "[]",
          metadataJson: "{}",
          createdAt: new Date().toISOString(),
        };
      }

      setMessages((prev) => prev.map((m) => m.id === tempId ? assistantMsg : m));

      // Save assistant message
      await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", type: assistantMsg.type, content: assistantMsg.content, attachmentsJson: assistantMsg.attachmentsJson, metadataJson: assistantMsg.metadataJson }),
      });
    } catch (e) {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, type: "error", content: "网络错误" } : m));
    }
  }

  async function handleChatCompletion(convId: string, _content: string) {
    // For now, a simple response. PR4+ can integrate streaming LLM.
    const reply: Message = {
      id: "chat-" + Date.now(),
      role: "assistant",
      type: "text",
      content: "对话功能已接入。当前为基础模式，后续将集成流式 LLM 回复。\n\n提示：切换到「画图」模式可以生成图片。",
      attachmentsJson: "[]",
      metadataJson: "{}",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, reply]);
    await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "assistant", type: "text", content: reply.content }),
    });
  }

  if (!conversationId && !isMobile) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="选择或创建对话"
          description="从左侧选择已有对话，或点击 + 新建"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      {isMobile && (
        <div className="flex h-12 items-center border-b px-3 gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium truncate">对话</span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="开始对话"
              description="输入文字聊天，或切换到画图模式生成图片"
            />
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {sending && (
              <div className="flex gap-2 items-center text-muted-foreground text-sm">
                <div className="flex gap-1">
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
