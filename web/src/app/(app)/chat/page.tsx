import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/**
 * /chat - placeholder (PR4 will implement full chat UI)
 */
export default function ChatPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<MessageSquare className="h-12 w-12" />}
        title="开始对话"
        description="发送消息即可生成图片或与 AI 聊天。支持文字、画图混合对话。"
        action={
          <Button size="lg">
            <MessageSquare className="mr-2 h-4 w-4" />
            新对话
          </Button>
        }
      />
    </div>
  );
}
