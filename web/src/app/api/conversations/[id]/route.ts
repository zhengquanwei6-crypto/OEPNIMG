import { NextResponse } from "next/server";
import { getConversation, updateConversation, deleteConversation } from "@/lib/services/conversation";

// GET /api/conversations/:id — 获取对话详情（含消息）
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const conv = await getConversation(params.id);
  if (!conv) return NextResponse.json({ ok: false, error: "对话不存在" }, { status: 404 });
  return NextResponse.json({ ok: true, data: conv });
}

// PATCH /api/conversations/:id — 更新对话（标题/置顶/归档）
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const conv = await updateConversation(params.id, body);
  return NextResponse.json({ ok: true, data: conv });
}

// DELETE /api/conversations/:id — 删除对话
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await deleteConversation(params.id);
  return NextResponse.json({ ok: true });
}
