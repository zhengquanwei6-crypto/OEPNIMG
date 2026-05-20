/**
 * 对话 (Conversation + Message) 服务
 *
 * 支持：
 * - 创建/列出/删除对话
 * - 追加消息（user/assistant/system）
 * - 自动生成对话标题（首条消息前 20 字）
 */

import { db } from "@/lib/db";

// ─── 对话 CRUD ───

export async function createConversation(userId?: string | null, title?: string) {
  return db.conversation.create({
    data: {
      userId: userId ?? null,
      title: title ?? "新对话",
    },
  });
}

export async function listConversations(userId?: string | null, opts?: { includeArchived?: boolean }) {
  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
  if (!opts?.includeArchived) where.archived = false;

  return db.conversation.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      pinned: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    take: 100,
  });
}

export async function getConversation(id: string) {
  return db.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function updateConversation(id: string, data: { title?: string; pinned?: boolean; archived?: boolean }) {
  return db.conversation.update({ where: { id }, data });
}

export async function deleteConversation(id: string) {
  return db.conversation.delete({ where: { id } });
}

// ─── 消息 ───

export interface AddMessageInput {
  conversationId: string;
  role: "user" | "assistant" | "system";
  type?: "text" | "image" | "error" | "progress";
  content?: string;
  attachmentsJson?: string;
  generationId?: string;
  metadataJson?: string;
}

export async function addMessage(input: AddMessageInput) {
  const msg = await db.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      type: input.type ?? "text",
      content: input.content ?? "",
      attachmentsJson: input.attachmentsJson ?? "[]",
      generationId: input.generationId ?? null,
      metadataJson: input.metadataJson ?? "{}",
    },
  });

  // 自动更新对话的 updatedAt
  await db.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  // 如果是第一条 user 消息且对话标题是默认的，自动生成标题
  if (input.role === "user" && input.content) {
    const conv = await db.conversation.findUnique({
      where: { id: input.conversationId },
      select: { title: true, _count: { select: { messages: true } } },
    });
    if (conv && conv._count.messages <= 2 && conv.title === "新对话") {
      const autoTitle = input.content.slice(0, 30) + (input.content.length > 30 ? "…" : "");
      await db.conversation.update({
        where: { id: input.conversationId },
        data: { title: autoTitle },
      });
    }
  }

  return msg;
}

export async function getMessages(conversationId: string, opts?: { limit?: number; before?: string }) {
  const where: Record<string, any> = { conversationId };
  if (opts?.before) {
    const ref = await db.message.findUnique({ where: { id: opts.before }, select: { createdAt: true } });
    if (ref) where.createdAt = { lt: ref.createdAt };
  }

  return db.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: opts?.limit ?? 200,
  });
}
