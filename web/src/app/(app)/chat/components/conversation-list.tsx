"use client";

import * as React from "react";
import { Plus, Pin, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ConvItem {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  _count: { messages: number };
}

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  refreshKey: number;
}

export function ConversationList({ activeId, onSelect, refreshKey }: Props) {
  const [conversations, setConversations] = React.useState<ConvItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchList = React.useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      if (json.ok) setConversations(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchList(); }, [fetchList, refreshKey]);

  async function handleNew() {
    const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const json = await res.json();
    if (json.ok) {
      setConversations((prev) => [json.data, ...prev]);
      onSelect(json.data.id);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) onSelect(conversations[0]?.id ?? "");
  }

  async function handlePin(e: React.MouseEvent, id: string, pinned: boolean) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !pinned }) });
    fetchList();
  }

  // Group: pinned, today, earlier
  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);
  const today = new Date().toDateString();
  const todayItems = unpinned.filter((c) => new Date(c.updatedAt).toDateString() === today);
  const earlier = unpinned.filter((c) => new Date(c.updatedAt).toDateString() !== today);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">对话</span>
        <Button variant="ghost" size="icon-sm" onClick={handleNew} title="新对话">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-2 p-3">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
            <p>暂无对话</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleNew}>
              <Plus className="mr-1 h-3 w-3" /> 新建
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {pinned.length > 0 && (
              <>
                <p className="px-2 py-1 text-xs text-muted-foreground font-medium">📌 置顶</p>
                {pinned.map((c) => <Item key={c.id} conv={c} active={c.id === activeId} onSelect={onSelect} onDelete={handleDelete} onPin={handlePin} />)}
              </>
            )}
            {todayItems.length > 0 && (
              <>
                <p className="px-2 py-1 text-xs text-muted-foreground font-medium">今天</p>
                {todayItems.map((c) => <Item key={c.id} conv={c} active={c.id === activeId} onSelect={onSelect} onDelete={handleDelete} onPin={handlePin} />)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <p className="px-2 py-1 text-xs text-muted-foreground font-medium">更早</p>
                {earlier.map((c) => <Item key={c.id} conv={c} active={c.id === activeId} onSelect={onSelect} onDelete={handleDelete} onPin={handlePin} />)}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function Item({ conv, active, onSelect, onDelete, onPin }: {
  conv: ConvItem;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onPin: (e: React.MouseEvent, id: string, pinned: boolean) => void;
}) {
  return (
    <div
      onClick={() => onSelect(conv.id)}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
    >
      <span className="flex-1 truncate">{conv.title}</span>
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button onClick={(e) => onPin(e, conv.id, conv.pinned)} className="rounded p-1 hover:bg-background/50" title={conv.pinned ? "取消置顶" : "置顶"}>
          <Pin className={cn("h-3 w-3", conv.pinned && "text-primary")} />
        </button>
        <button onClick={(e) => onDelete(e, conv.id)} className="rounded p-1 hover:bg-destructive/20 text-destructive" title="删除">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
