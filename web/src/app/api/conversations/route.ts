import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createConversation, listConversations } from "@/lib/services/conversation";

// GET /api/conversations — 列出当前用户的对话
export async function GET() {
  const sess = await getSession();
  const items = await listConversations(sess.userId);
  return NextResponse.json({ ok: true, data: items });
}

// POST /api/conversations — 创建新对话
export async function POST(req: Request) {
  const sess = await getSession();
  const body = await req.json().catch(() => ({}));
  const conv = await createConversation(sess.userId, body.title);
  return NextResponse.json({ ok: true, data: conv }, { status: 201 });
}
