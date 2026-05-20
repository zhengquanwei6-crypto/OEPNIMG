import { NextResponse } from "next/server";
import { addMessage, getMessages } from "@/lib/services/conversation";

// GET /api/conversations/:id/messages — 获取消息列表
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || 200;
  const before = url.searchParams.get("before") ?? undefined;
  const messages = await getMessages(params.id, { limit, before });
  return NextResponse.json({ ok: true, data: messages });
}

// POST /api/conversations/:id/messages — 追加消息
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const msg = await addMessage({
    conversationId: params.id,
    role: body.role ?? "user",
    type: body.type,
    content: body.content,
    attachmentsJson: body.attachmentsJson,
    generationId: body.generationId,
    metadataJson: body.metadataJson,
  });
  return NextResponse.json({ ok: true, data: msg }, { status: 201 });
}
